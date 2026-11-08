# What a new project starts with, and how it is made: documents (with their
# content), Collections (a name and fields, no records) and tasks. A project
# type is a template. The built-in types send theirs from the web app
# (frontend/src/data/projectType.ts); a Space's saved types keep theirs in
# project_types.template. See docs/features/project_types.md.
#
#   ProjectTemplate.clean(raw)               # a safe copy of what a client sent, or Invalid
#   ProjectTemplate.snapshot(folder)         # the template of an existing project
#   ProjectTemplate.apply(raw, folder:, user:)  # creates the records in the project
#
# Shape (string keys, as stored):
#   { "documents"   => [ { "title", "doc_type" ("document" or "spreadsheet"), "content" } ],
#     "collections" => [ { "title", "fields" => [ { "name", "data_type" } ] } ],
#     "tasks"       => [ { "title" } ] }
class ProjectTemplate
  class Invalid < StandardError; end

  DOCUMENT_TYPES = %w[document spreadsheet].freeze
  # The Collection field types a template can carry. Links to other Collections,
  # files and formulas are left out: they point at things outside the template.
  FIELD_TYPES = %w[text integer number boolean date datetime].freeze
  MAX_DOCUMENTS = 20
  MAX_COLLECTIONS = 10
  MAX_FIELDS = 30
  MAX_TASKS = 100
  MAX_TITLE = 255
  MAX_BYTES = 1.megabyte

  # A clean copy of `raw` (a Hash or request parameters; nil is an empty
  # template), keeping only what a template holds. Raises Invalid with a reason
  # a person can act on.
  def self.clean(raw)
    raw = raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)
    raw = {} if raw.nil?
    raise Invalid, "The template must be an object." unless raw.is_a?(Hash)

    raw = raw.stringify_keys
    template = {
      "documents" => items(raw["documents"], "documents", MAX_DOCUMENTS) { |item| clean_document(item) },
      "collections" => items(raw["collections"], "Collections", MAX_COLLECTIONS) { |item| clean_collection(item) },
      "tasks" => items(raw["tasks"], "tasks", MAX_TASKS) { |item| { "title" => title!(item, "A task") } }
    }
    raise Invalid, "The template is too large." if template.to_json.bytesize > MAX_BYTES

    template
  end

  # The template of a project: its documents and sheets with their content, its
  # Collections' fields, and its tasks that belong to no document (checklist
  # lines in a document come back from the document's own content). Subfolders
  # are flattened into the project; uploaded files and records are left out.
  # Raises Invalid when the project has more than a template can hold.
  def self.snapshot(folder)
    folder_ids = folder.self_and_descendant_ids
    documents = Document.where(folder_id: folder_ids).order(:id)
    clean(
      "documents" => documents.where(doc_type: DOCUMENT_TYPES).map { |d| { "title" => d.title, "doc_type" => d.doc_type, "content" => d.content } },
      "collections" => documents.where(doc_type: "table").map { |d| { "title" => d.title, "fields" => d.table_fields.where(data_type: FIELD_TYPES).order(:id).map { |f| f.slice(:name, :data_type) } } },
      "tasks" => folder.workspace.tasks.where(folder_id: folder_ids, document_id: nil, parent_id: nil).reorder(:position, :id).map { |t| { "title" => t.title } }
    )
  end

  # Creates the template's documents, Collections and tasks in `folder`. The
  # caller wraps this and the folder's own save in one transaction.
  def self.apply(raw, folder:, user:)
    template = clean(raw)
    template["documents"].each do |item|
      folder.documents.create!(title: item["title"], doc_type: item["doc_type"], content: item["content"], created_by: user)
    end
    template["collections"].each do |item|
      table = folder.documents.create!(title: item["title"], doc_type: "table", created_by: user)
      item["fields"].each { |field| table.table_fields.create!(name: field["name"], data_type: field["data_type"]) }
    end
    template["tasks"].each_with_index do |item, position|
      folder.workspace.tasks.create!(title: item["title"], folder: folder, position: position)
    end
    template
  end

  def self.items(list, label, max)
    return [] if list.nil?
    raise Invalid, "The template's #{label} must be a list." unless list.is_a?(Array)
    raise Invalid, "A template can hold at most #{max} #{label}." if list.size > max

    list.map { |item| yield hash!(item, label) }
  end

  def self.hash!(item, label)
    raise Invalid, "Each of the template's #{label} must be an object." unless item.is_a?(Hash)

    item.stringify_keys
  end

  def self.title!(item, what)
    title = item["title"].to_s.strip
    raise Invalid, "#{what} needs a title." if title.empty?
    raise Invalid, "#{what} title can be at most #{MAX_TITLE} characters." if title.length > MAX_TITLE

    title
  end

  def self.clean_document(item)
    doc_type = item["doc_type"].presence || "document"
    raise Invalid, "A document must be a #{DOCUMENT_TYPES.join(' or ')}." unless DOCUMENT_TYPES.include?(doc_type)
    content = item["content"] || {}
    raise Invalid, "A document's content must be an object." unless content.is_a?(Hash)

    # Checklist lines keep their text but not the link to the task they made
    # in the source project; the editor makes a new task for each in the copy.
    { "title" => title!(item, "A document"), "doc_type" => doc_type, "content" => SpaceTransfer.remap_task_ids(content, {}) }
  end

  def self.clean_collection(item)
    fields = items(item["fields"], "fields", MAX_FIELDS) { |field| clean_field(field) }
    names = fields.map { |field| field["name"] }
    raise Invalid, "A Collection can't have two fields named #{(names.find { |n| names.count(n) > 1 }).inspect}." if names.uniq.size < names.size

    { "title" => title!(item, "A Collection"), "fields" => fields }
  end

  def self.clean_field(field)
    name = field["name"].to_s.strip
    raise Invalid, "A field needs a name." if name.empty?
    raise Invalid, "A field name can be at most #{MAX_TITLE} characters." if name.length > MAX_TITLE
    raise Invalid, "A field's type must be one of #{FIELD_TYPES.join(', ')}." unless FIELD_TYPES.include?(field["data_type"])

    { "name" => name, "data_type" => field["data_type"] }
  end

  private_class_method :items, :hash!, :title!, :clean_document, :clean_collection, :clean_field
end
