class ShareBlueprint < Blueprinter::Base
  identifier :id
  fields :token, :permission, :created_at

  field :shareable_type
  field :shareable_id

  view :with_resource do
    field :resource do |share, _options|
      case share.shareable_type
      when "Folder"
        FolderBlueprint.render_as_hash(share.shareable, view: :with_children)
      when "Workspace"
        { roadmap: RoadmapSnapshot.for(share.shareable) }
      when "Document"
        DocumentBlueprint.render_as_hash(share.shareable, view: :with_content)
      end
    end
  end
end
