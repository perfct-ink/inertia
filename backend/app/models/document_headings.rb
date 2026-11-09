# The headings in a document's saved content (editor JSON), in order. It mirrors
# `headingsOf` in frontend/src/data/heading.ts, which turns them into anchors, so
# keep the two in step: a heading is `{ id:, text:, level: }`, `id` is the
# permanent id stored on it (nil until the editor assigns one), `text` is its
# trimmed text with a line break read as a space, and `level` is 1 to 6.
#
# Plain Ruby with no database or framework dependency, so it is easy to test.
module DocumentHeadings
  HEADING = "heading".freeze
  HARD_BREAK = "hardBreak".freeze

  # Headings of `content`, or [] when it is empty or not editor JSON.
  def self.of(content)
    found = []
    walk(content, found)
    found
  end

  def self.walk(node, found)
    return unless node.is_a?(Hash)

    if node["type"] == HEADING
      attrs = node["attrs"].is_a?(Hash) ? node["attrs"] : {}
      id = attrs["id"]
      found << { id: id.is_a?(String) && !id.empty? ? id : nil, text: trim(text_of(node)), level: level_of(attrs["level"]) }
      return
    end
    children(node).each { |child| walk(child, found) }
  end

  def self.text_of(node)
    return "" unless node.is_a?(Hash)
    return " " if node["type"] == HARD_BREAK
    return node["text"] if node["text"].is_a?(String)

    children(node).map { |child| text_of(child) }.join
  end

  def self.children(node)
    node["content"].is_a?(Array) ? node["content"] : []
  end

  def self.trim(text)
    text.gsub(/\A[[:space:]]+|[[:space:]]+\z/, "")
  end

  def self.level_of(value)
    level = value.respond_to?(:to_i) ? value.to_i : 0
    level.zero? ? 1 : level
  end
  private_class_method :walk, :text_of, :children, :trim, :level_of
end
