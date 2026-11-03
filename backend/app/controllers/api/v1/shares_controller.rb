module Api
  module V1
    # Share links for documents and folders. Writers in the shared item's Space
    # list, make and revoke links; anyone holding a token opens the public,
    # read-only endpoints (access, access_document) without signing in.
    class SharesController < ApplicationController
      include WorkspaceScoped
      # Shares are found by id across the user's workspaces; the role is checked
      # against the shared item's own workspace.
      skip_before_action :require_current_workspace_write!
      skip_before_action :authenticate_user!, only: [ :access, :access_document ]

      PUBLIC_ACTIONS = [ :access, :access_document ].freeze

      # The public endpoints are open to the internet, so: no caching of any
      # kind (a revoked link must stop working at once), no search indexing, no
      # referrer leaking the token to sites the page links to, and a request
      # limit per IP address (counted in Rails.cache).
      before_action :harden_public_response, only: PUBLIC_ACTIONS
      rate_limit to: 120, within: 1.minute, only: PUBLIC_ACTIONS,
        with: -> { render json: { error: "Too many requests. Try again in a minute." }, status: :too_many_requests }
      before_action :set_share, only: [ :show, :destroy ]

      def index
        shareable = find_shareable
        require_write_in!(workspace_id_of(shareable))
        render json: ShareBlueprint.render(shareable.shares.order(:created_at))
      end

      def create
        shareable = find_shareable
        require_write_in!(workspace_id_of(shareable))
        days = expiry_days
        return render json: { errors: [ "Expiry must be between 1 and #{Share::MAX_EXPIRY_DAYS} days, or left empty" ] }, status: :unprocessable_entity if days == :invalid

        share = shareable.shares.build(permission: share_input[:permission].presence || "view", created_by: current_user)
        share.expires_at = days.days.from_now if days
        if share.save
          render json: ShareBlueprint.render(share), status: :created
        else
          render json: { errors: share.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def show
        render json: ShareBlueprint.render(@share)
      end

      # GET /api/v1/shared/:token (public)
      def access
        render json: SharedContent.for(Share.open!(params[:token]))
      end

      # GET /api/v1/shared/:token/documents/:document_id (public): a document
      # inside a shared folder. Unknown documents and ones outside the folder
      # answer the same 404.
      def access_document
        share = Share.open!(params[:token])
        document = Document.find(params[:document_id])
        raise ActiveRecord::RecordNotFound unless share.covers?(document)
        render json: SharedContent.document(share, document)
      end

      def destroy
        @share.destroy
        head :no_content
      end

      private

      def harden_public_response
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
      end

      # A link's token is a credential, so only people who can change the
      # shared item see or revoke it (a viewer in the Space can't). Roadmap
      # links have their own endpoint and are not reachable here.
      def set_share
        @share = Share.where(shareable_type: %w[Folder Document]).find(params[:id])
        require_write_in!(workspace_id_of(@share.shareable))
      end

      def find_shareable
        if params[:folder_id]
          Folder.where(workspace_id: accessible_workspace_ids).find(params[:folder_id])
        else
          Document.joins(:folder).where(folders: { workspace_id: accessible_workspace_ids }).find(params[:document_id])
        end
      end

      def workspace_id_of(shareable)
        shareable.is_a?(Folder) ? shareable.workspace_id : shareable.folder.workspace_id
      end

      # The link's settings, whatever shape the request body has.
      def share_input
        params.permit(share: [ :permission, :expires_in_days ])[:share]&.to_h || {}
      end

      # nil when the link doesn't expire, :invalid when the value isn't a
      # whole number of days in range.
      def expiry_days
        value = share_input[:expires_in_days]
        return if value.blank?

        days = Integer(value.to_s, 10, exception: false)
        days && (1..Share::MAX_EXPIRY_DAYS).cover?(days) ? days : :invalid
      end
    end
  end
end
