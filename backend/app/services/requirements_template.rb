# The requirements document every feature starts with (see
# docs/features/feature_requirements_docs.md): the same sections as
# REQUIREMENTS_TEMPLATE in frontend/src/data/documentTemplate.ts, built as
# editor (TipTap) JSON. Keep the two in step.
module RequirementsTemplate
  module_function

  def content(title)
    {
      "type" => "doc",
      "content" => [
        heading(1, title),
        heading(2, "Problem"),
        paragraph("What is wrong or missing today, and for whom?"),
        heading(2, "Goals"),
        bullets([ "" ]),
        heading(2, "User stories"),
        bullets([ "As a …, I want …, so that …" ]),
        heading(2, "Acceptance criteria"),
        bullets([ "" ]),
        heading(2, "Out of scope"),
        bullets([ "" ]),
        heading(2, "Tasks"),
        tasks([ "" ])
      ]
    }
  end

  def text(value)
    value.to_s.empty? ? [] : [ { "type" => "text", "text" => value } ]
  end

  def heading(level, value)
    { "type" => "heading", "attrs" => { "level" => level }, "content" => text(value) }
  end

  def paragraph(value = "")
    value.empty? ? { "type" => "paragraph" } : { "type" => "paragraph", "content" => text(value) }
  end

  def bullets(items)
    { "type" => "bulletList", "content" => items.map { |item| { "type" => "listItem", "content" => [ paragraph(item) ] } } }
  end

  # Checklist lines become Space tasks once the document is open (docs/features/document_task_lines.md).
  def tasks(items)
    { "type" => "workspaceTaskList", "content" => items.map { |item| { "type" => "workspaceTaskItem", "content" => [ paragraph(item) ] } } }
  end
end
