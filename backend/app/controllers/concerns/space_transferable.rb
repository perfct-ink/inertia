# Moving or copying a document or folder into a folder of another Space.
# Include after WorkspaceScoped. The source is found and checked by the
# including controller (its own `set_*` action); this checks the destination:
# the folder named by `target_folder_id` must be in a Space the user belongs to
# with at least the member role, and an unusable destination is reported like
# any other validation failure.
module SpaceTransferable
  extend ActiveSupport::Concern

  private

  # Yields a SpaceTransfer into the target folder.
  def with_space_transfer
    target = Folder.where(workspace_id: accessible_workspace_ids).find(params.require(:target_folder_id))
    require_write_in!(target.workspace_id)
    yield SpaceTransfer.new(user: current_user, target_folder: target)
  rescue SpaceTransfer::Error => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end
end
