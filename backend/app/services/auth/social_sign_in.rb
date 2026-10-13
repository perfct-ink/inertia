require "net/http"
require "jwt"
require "openssl"
require "base64"

module Auth
  class SocialSignIn
    class Error < StandardError; end
    class NotConfigured < Error; end
    PROVIDERS = {
      "google" => { authorization: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", keys: "https://www.googleapis.com/oauth2/v3/certs", issuers: [ "https://accounts.google.com", "accounts.google.com" ], scope: "openid email profile" },
      "apple" => { authorization: "https://appleid.apple.com/auth/authorize", token: "https://appleid.apple.com/auth/token", keys: "https://appleid.apple.com/auth/keys", issuers: [ "https://appleid.apple.com" ], scope: "name email" }
    }.freeze

    def self.challenge(verifier)
      Base64.urlsafe_encode64(Digest::SHA256.digest(verifier), padding: false)
    end

    def initialize(provider)
      @provider = provider
      @settings = PROVIDERS.fetch(provider) { raise Error, "Unsupported sign-in provider." }
      @client_id = ENV["#{provider.upcase}_CLIENT_ID"]
    end

    def configured!
      required = @provider == "apple" ? %w[APPLE_CLIENT_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY] : %w[GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET]
      raise NotConfigured, "#{@provider.capitalize} sign-in is not configured yet." unless required.all? { |key| ENV[key].present? }
      uri = URI(ENV.fetch("OAUTH_CALLBACK_BASE_URL", ""))
      valid = uri.host.present? && uri.query.nil? && uri.fragment.nil? && (uri.scheme == "https" || (@provider == "google" && !Rails.env.production? && uri.scheme == "http" && uri.host == "localhost"))
      valid &&= uri.host != "localhost" && !uri.host.match?(/\A[\d.:]+\z/) if @provider == "apple"
      raise NotConfigured, "Configure a public HTTPS sign-in callback URL." unless valid
    rescue URI::InvalidURIError
      raise NotConfigured, "Configure a public HTTPS sign-in callback URL."
    end

    def redirect_uri
      "#{ENV.fetch('OAUTH_CALLBACK_BASE_URL').delete_suffix('/')}/api/v1/auth/social/#{@provider}/callback"
    end

    def authorization_url(attempt, state)
      params = { client_id: @client_id, redirect_uri: redirect_uri, response_type: "code", scope: @settings[:scope], state: state, nonce: attempt.nonce }
      if @provider == "apple"
        params[:response_mode] = "form_post"
      else
        params[:code_challenge] = self.class.challenge(attempt.provider_verifier)
        params[:code_challenge_method] = "S256"
        params[:prompt] = "select_account"
      end
      "#{@settings[:authorization]}?#{URI.encode_www_form(params)}"
    end

    def claims(code, attempt)
      raise Error, "The provider did not return an authorization code." if code.blank?
      params = { client_id: @client_id, client_secret: client_secret, code: code, grant_type: "authorization_code", redirect_uri: redirect_uri }
      params[:code_verifier] = attempt.provider_verifier if @provider == "google"
      token = json_request(@settings[:token], params).fetch("id_token")
      keys = json_request(@settings[:keys])
      claims = JWT.decode(token, nil, true, algorithms: [ "RS256" ], jwks: keys,
        verify_iss: true, iss: @settings[:issuers], verify_aud: true, aud: @client_id,
        verify_expiration: true, required_claims: %w[iss aud exp sub nonce]).first
      unless claims["sub"].present? && ActiveSupport::SecurityUtils.secure_compare(claims["nonce"].to_s, attempt.nonce)
        raise Error, "Unable to verify the provider's response."
      end
      claims
    rescue JWT::DecodeError, KeyError, JSON::ParserError
      raise Error, "Unable to verify the provider's response. Please try again."
    end

    def user_for(claims)
      identity = SocialIdentity.find_by(provider: @provider, subject: claims.fetch("sub"))
      return identity.user if identity
      unless [ true, "true" ].include?(claims["email_verified"]) && claims["email"].present?
        raise Error, "The provider must supply a verified email address to create an account."
      end
      email = claims["email"].strip.downcase
      # Never silently link a password account based on a third-party email.
      if User.exists?(email: email)
        raise Error, "An Inertia account already uses this email. Sign in with your password."
      end
      User.transaction do
        user = User.create!(email: email, name: claims["name"].presence || email.split("@").first, password: SecureRandom.hex(32))
        SocialIdentity.create!(user: user, provider: @provider, subject: claims.fetch("sub"))
        user
      end
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
      raise Error, "Unable to create this account. Try signing in again or use your password."
    end

    private

    def client_secret
      return ENV.fetch("GOOGLE_CLIENT_SECRET") if @provider == "google"
      now = Time.current.to_i
      JWT.encode({ iss: ENV.fetch("APPLE_TEAM_ID"), iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: @client_id },
        OpenSSL::PKey.read(ENV.fetch("APPLE_PRIVATE_KEY").gsub('\\n', "\n")), "ES256", { kid: ENV.fetch("APPLE_KEY_ID") })
    rescue OpenSSL::PKey::PKeyError
      raise NotConfigured, "Apple sign-in credentials need to be configured."
    end

    def json_request(url, form = nil)
      uri = URI(url)
      request = form ? Net::HTTP::Post.new(uri) : Net::HTTP::Get.new(uri)
      request.set_form_data(form) if form
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(request) }
      raise Error, "The sign-in provider is unavailable. Please try again." unless response.is_a?(Net::HTTPSuccess)
      JSON.parse(response.body)
    rescue Timeout::Error, SocketError, IOError, SystemCallError, OpenSSL::SSL::SSLError
      raise Error, "Unable to reach the sign-in provider. Please try again."
    end
  end
end
