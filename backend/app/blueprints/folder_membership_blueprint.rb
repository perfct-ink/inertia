class FolderMembershipBlueprint < Blueprinter::Base
  identifier :id
  fields :role, :user_id, :folder_id, :created_at

  field :user do |membership|
    { id: membership.user.id, name: membership.user.name, email: membership.user.email }
  end

  field :invited_by do |membership|
    membership.invited_by&.name
  end

  # A person listed for a folder: the folder they were invited to, and whether
  # that is a folder above it (the access is inherited, so it is changed there).
  view :for_folder do
    field :folder_name do |membership|
      membership.folder.name
    end

    field :inherited do |membership, options|
      membership.folder_id != options.fetch(:folder_id)
    end
  end

  # One entry of "Shared with me": the invited folder with its tree, the role
  # held on it, the Space it lives in and who invited the user.
  view :shared do
    field :space do |membership|
      { id: membership.folder.workspace_id, name: membership.folder.workspace.name }
    end

    field :folder do |membership|
      FolderBlueprint.render_as_hash(membership.folder, view: :with_children)
    end
  end
end
