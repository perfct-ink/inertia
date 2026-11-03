# Narrows a Space's lists to one project. The client names the selected
# project (a folder) with the X-Project-Id header; without it lists cover the
# whole Space. A folder in another Space is "not found" (404).
#
# A project's lists include its subfolders. New records are filed in the
# project unless the request names a folder itself. Single-record reads and
# updates ignore the header.
module ProjectScoped
  extend ActiveSupport::Concern

  PROJECT_HEADER = "X-Project-Id".freeze

  private

  def current_project
    return @current_project if defined?(@current_project)
    id = request.headers[PROJECT_HEADER].presence
    @current_project = id && current_workspace.folders.find(id)
  end

  def project_folder_ids
    @project_folder_ids ||= current_project&.self_and_descendant_ids
  end

  def in_current_project(records)
    current_project ? records.where(folder_id: project_folder_ids) : records
  end

  def file_in_current_project(record)
    record.folder_id ||= current_project&.id
    record
  end
end
