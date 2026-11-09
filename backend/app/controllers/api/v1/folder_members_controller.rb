module Api
  module V1
    # The people invited to a folder (and so to everything inside it) and their
    # roles. Only people who can manage the folder's sharing (admins and owners
    # of its Space, or an owner invitation) see or change the list; anyone
    # invited can leave. Folders in a personal Space and the Root are never
    # shared.
    class FolderMembersController < ApplicationController
      include WorkspaceScoped
      include FolderCollaboration
      skip_before_action :require_current_workspace_write!
      before_action :set_folder

      # Invitations on this folder plus those on folders above it that the
      # viewer can see (inherited ones are read-only here).
      def index
        require_folder_manage!(@folder)
        memberships = FolderMembership.where(folder_id: visible_folder_ids).includes(:user, :invited_by, :folder).order(:created_at)
        render json: FolderMembershipBlueprint.render(memberships, view: :for_folder, folder_id: @folder.id)
      end

      # Invites an existing user by email; the role defaults to viewer.
      def create
        require_folder_manage!(@folder)
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        return render json: { errors: [ "No user with that email" ] }, status: :unprocessable_entity unless user

        membership = @folder.folder_memberships.build(user: user, role: requested_role || :viewer, invited_by: current_user)
        if membership.save
          render json: FolderMembershipBlueprint.render(membership, view: :for_folder, folder_id: @folder.id), status: :created
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        require_folder_manage!(@folder)
        membership = @folder.folder_memberships.find(params[:id])
        role = requested_role
        return render json: { errors: [ "Role is invalid" ] }, status: :unprocessable_entity unless role
        return render json: { errors: [ "You can't change your own role" ] }, status: :unprocessable_entity if membership.user_id == current_user.id

        if membership.update(role: role)
          render json: FolderMembershipBlueprint.render(membership, view: :for_folder, folder_id: @folder.id)
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # A manager removes anyone invited to this folder; anyone invited can
      # remove themselves (leave).
      def destroy
        membership = @folder.folder_memberships.find(params[:id])
        require_folder_manage!(@folder) unless membership.user_id == current_user.id
        membership.destroy!
        head :no_content
      end

      private

      def set_folder
        @folder = find_accessible_folder(params[:folder_id])
      end

      # Everything the viewer may know about who has access: all of it for
      # Space admins and owners; for an invited owner only the part of the
      # chain that is inside their own invitation.
      def visible_folder_ids
        ids = @folder.self_and_ancestor_ids
        space_member_of?(@folder.workspace_id) ? ids : ids & shared_folder_ids
      end

      def requested_role
        role = params[:role].to_s
        role if FolderMembership.roles.key?(role)
      end
    end
  end
end
