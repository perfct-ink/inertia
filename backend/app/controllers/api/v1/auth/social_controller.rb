module Api
  module V1
    module Auth
      class SocialController < ApplicationController
        skip_before_action :authenticate_user!
        before_action :disable_caching
        rescue_from ::Auth::SocialSignIn::Error, with: :sign_in_error
        rescue_from ::Auth::SocialSignIn::NotConfigured, with: :not_configured

        def start
          service = ::Auth::SocialSignIn.new(params[:provider])
          service.configured!
          state = SecureRandom.urlsafe_base64(32)
          # Attempts are short-lived and need not accumulate indefinitely.
          SocialLoginAttempt.where("expires_at < ?", 1.day.ago).delete_all
          attempt = SocialLoginAttempt.new(provider: params[:provider], state_digest: SocialLoginAttempt.digest(state),
            client_state: params[:state], code_challenge: params[:code_challenge], nonce: SecureRandom.urlsafe_base64(32),
            provider_verifier: SecureRandom.urlsafe_base64(32), expires_at: 10.minutes.from_now)
          raise ::Auth::SocialSignIn::Error, "Invalid sign-in request." unless attempt.save
          render json: { authorization_url: service.authorization_url(attempt, state) }
        end

        def callback
          attempt = SocialLoginAttempt.find_by!(state_digest: SocialLoginAttempt.digest(params[:state]), provider: params[:provider])
          attempt.with_lock do
            raise ::Auth::SocialSignIn::Error, "This sign-in has expired. Please try again." if attempt.callback_at || attempt.expires_at <= Time.current
            attempt.update!(callback_at: Time.current)
          end
          begin
            raise ::Auth::SocialSignIn::Error, "Sign-in was canceled or denied." if params[:error].present?
            service = ::Auth::SocialSignIn.new(attempt.provider)
            service.configured!
            user = service.user_for(service.claims(params[:code], attempt))
            code = SecureRandom.urlsafe_base64(32)
            attempt.update!(user: user, exchange_digest: SocialLoginAttempt.digest(code), expires_at: 2.minutes.from_now)
            return_to_app(attempt, code: code)
          rescue ::Auth::SocialSignIn::Error => error
            return_to_app(attempt, error: error.message)
          end
        end

        def exchange
          attempt = SocialLoginAttempt.find_by!(exchange_digest: SocialLoginAttempt.digest(params[:code]))
          user = attempt.exchange!(params[:code_verifier])
          token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
          response.set_header("Authorization", "Bearer #{token}")
          render json: { user: UserBlueprint.render_as_hash(user) }
        end

        private

        def return_to_app(attempt, values)
          # Fixed return target; callers cannot supply an arbitrary redirect.
          redirect_to "com.inertia.native://auth/callback?#{URI.encode_www_form(values.merge(state: attempt.client_state))}", allow_other_host: true
        end

        def disable_caching
          response.set_header("Cache-Control", "no-store")
          response.set_header("Referrer-Policy", "no-referrer")
        end

        def not_configured(error)
          render json: { error: error.message }, status: :service_unavailable
        end

        def sign_in_error(error)
          render json: { error: error.message }, status: :unauthorized
        end
      end
    end
  end
end
