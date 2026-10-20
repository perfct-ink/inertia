# Documents as Markdown for agents: render a TipTap JSON document to Markdown, and
# parse Markdown back to TipTap JSON. Task lines keep their task id in a comment
# (`- [ ] Write the spec <!-- task:12 -->`) so edits stay linked to their tasks.
#
# Covered: headings, paragraphs, bold, italic, underline (<u>), strike, inline
# code, links, bullet/ordered/task lists (bullet and ordered nest), code blocks,
# rules, line breaks and images. Tables, video and other blocks are rendered for
# reading (a table as a GFM table) but cannot be parsed back, so `unsupported`
# lists them and writers must not replace such a document wholesale.
module DocumentMarkdown
  READ_ONLY_BLOCKS = %w[table video].freeze
  TASK_COMMENT = /\s*<!--\s*task:(\d+)\s*-->\s*\z/

  module_function

  # ---- TipTap JSON -> Markdown ------------------------------------------------

  # `tasks` maps task id => status string, so done tasks are rendered ticked.
  def render(content, tasks: {})
    blocks = Array(content.is_a?(Hash) ? content["content"] : nil)
    blocks.map { |block| render_block(block, tasks, 0) }.reject(&:empty?).join("\n\n") + "\n"
  end

  # Names of block types in `content` that Markdown here cannot round-trip.
  def unsupported(content)
    found = []
    walk = lambda do |node|
      next unless node.is_a?(Hash)
      found << node["type"] if READ_ONLY_BLOCKS.include?(node["type"]) || !KNOWN_NODES.include?(node["type"])
      Array(node["content"]).each(&walk)
    end
    walk.call(content)
    found.uniq - [ "doc" ]
  end

  KNOWN_NODES = %w[doc heading paragraph text hardBreak bulletList orderedList listItem workspaceTaskList workspaceTaskItem codeBlock horizontalRule image table tableRow tableCell tableHeader video].freeze

  def render_block(node, tasks, depth)
    case node["type"]
    when "heading" then "#{'#' * node.dig('attrs', 'level').to_i.clamp(1, 6)} #{inline(node)}"
    when "paragraph" then inline(node)
    when "bulletList" then render_list(node, tasks, depth, ordered: false)
    when "orderedList" then render_list(node, tasks, depth, ordered: true)
    when "workspaceTaskList" then render_tasks(node, tasks)
    when "codeBlock" then "```#{node.dig('attrs', 'language')}\n#{plain_text(node)}\n```"
    when "horizontalRule" then "---"
    when "image" then "![#{node.dig('attrs', 'alt')}](#{node.dig('attrs', 'src')})"
    when "video" then "[video](#{node.dig('attrs', 'src')})"
    when "table" then render_table(node)
    else inline(node)
    end
  end

  def render_list(node, tasks, depth, ordered:)
    Array(node["content"]).each_with_index.map do |item, i|
      marker = ordered ? "#{i + 1}." : "-"
      indent = "  " * depth
      children = Array(item["content"])
      first = children.find { |c| c["type"] == "paragraph" }
      line = "#{indent}#{marker} #{first ? inline(first) : ''}"
      nested = children.select { |c| %w[bulletList orderedList].include?(c["type"]) }.map { |c| render_block(c, tasks, depth + 1) }
      ([ line ] + nested).join("\n")
    end.join("\n")
  end

  def render_tasks(node, tasks)
    Array(node["content"]).map do |item|
      id = item.dig("attrs", "taskId")
      box = tasks[id] == "done" ? "x" : " "
      "- [#{box}] #{inline(item.dig('content', 0) || {})}#{id ? " <!-- task:#{id} -->" : ''}"
    end.join("\n")
  end

  def render_table(node)
    rows = Array(node["content"]).map { |row| Array(row["content"]).map { |cell| plain_text(cell).tr("|\n", "/ ") } }
    return "" if rows.empty?
    header, *body = rows
    ([ "| #{header.join(' | ')} |", "| #{header.map { '---' }.join(' | ')} |" ] + body.map { |r| "| #{r.join(' | ')} |" }).join("\n")
  end

  def plain_text(node)
    return node["text"].to_s if node["type"] == "text"
    Array(node["content"]).map { |c| plain_text(c) }.join(node["type"] == "table" ? "\n" : "")
  end

  def inline(node)
    Array(node["content"]).map do |child|
      next "  \n" if child["type"] == "hardBreak"
      next "![#{child.dig('attrs', 'alt')}](#{child.dig('attrs', 'src')})" if child["type"] == "image"
      next inline(child) unless child["type"] == "text"
      mark_text(child["text"].to_s, Array(child["marks"]))
    end.join
  end

  def mark_text(text, marks)
    marks.reduce(text) do |out, mark|
      case mark["type"]
      when "bold" then "**#{out}**"
      when "italic" then "*#{out}*"
      when "strike" then "~~#{out}~~"
      when "underline" then "<u>#{out}</u>"
      when "code" then "`#{out}`"
      when "link" then "[#{out}](#{mark.dig('attrs', 'href')})"
      else out
      end
    end
  end

  # ---- Markdown -> TipTap JSON ------------------------------------------------

  # `title` becomes the leading heading when the Markdown doesn't start with one
  # (a document must begin with a heading).
  def parse(markdown, title: "Untitled")
    blocks = parse_blocks(markdown.to_s.gsub("\r\n", "\n").split("\n"))
    blocks.unshift(heading_node(1, title)) unless blocks.first && blocks.first["type"] == "heading"
    { "type" => "doc", "content" => blocks }
  end

  def heading_node(level, text)
    { "type" => "heading", "attrs" => { "level" => level }, "content" => inline_nodes(text) }
  end

  LIST_ITEM = /\A(\s*)([-*+]|\d+[.)])\s+(.*)\z/
  TASK_ITEM = /\A\[( |x|X)\]\s+(.*)\z/

  def parse_blocks(lines)
    blocks = []
    i = 0
    while i < lines.size
      line = lines[i]
      if line.strip.empty?
        i += 1
      elsif line =~ /\A```(\w*)\s*\z/
        language = Regexp.last_match(1)
        i += 1
        code = []
        while i < lines.size && lines[i] !~ /\A```\s*\z/
          code << lines[i]
          i += 1
        end
        i += 1
        node = { "type" => "codeBlock", "attrs" => { "language" => language.presence } }
        node["content"] = [ { "type" => "text", "text" => code.join("\n") } ] unless code.empty?
        blocks << node
      elsif line =~ /\A(#+)\s+(.*?)\s*#*\s*\z/ && Regexp.last_match(1).size <= 6
        blocks << heading_node(Regexp.last_match(1).size.clamp(1, 5), Regexp.last_match(2))
        i += 1
      elsif line =~ /\A\s*([-*_])(\s*\1){2,}\s*\z/
        blocks << { "type" => "horizontalRule" }
        i += 1
      elsif line =~ LIST_ITEM
        items = []
        while i < lines.size && lines[i] =~ LIST_ITEM
          items << lines[i]
          i += 1
        end
        blocks.concat(parse_list(items))
      else
        paragraph = []
        while i < lines.size && !lines[i].strip.empty? && lines[i] !~ /\A```/ && lines[i] !~ /\A#+\s/ && lines[i] !~ LIST_ITEM
          paragraph << lines[i].strip
          i += 1
        end
        blocks.concat(split_images(paragraph_node(paragraph.join(" "))))
      end
    end
    blocks
  end

  # Images are blocks in the editor, so an image inside a paragraph splits it.
  def split_images(paragraph)
    content = Array(paragraph["content"])
    return [ paragraph ] unless content.any? { |n| n["type"] == "image" }
    blocks = []
    run = []
    flush = -> { blocks << { "type" => "paragraph", "content" => run } unless run.empty?; run = [] }
    content.each do |n|
      if n["type"] == "image" then flush.call; blocks << n else run << n end
    end
    flush.call
    blocks
  end

  def paragraph_node(text)
    nodes = inline_nodes(text)
    node = { "type" => "paragraph" }
    node["content"] = nodes unless nodes.empty?
    node
  end

  # Items at the same indent form a list; deeper ones nest in the previous item.
  def parse_list(lines)
    entries = lines.map do |l|
      m = LIST_ITEM.match(l)
      { indent: m[1].size, ordered: m[2] =~ /\d/ ? true : false, text: m[3] }
    end
    build_list(entries, 0, entries.first[:indent]).first
  end

  # Returns [list_nodes, next_index]: consecutive same-kind items at `indent`
  # become one list; items at greater indent become nested lists of the item above.
  def build_list(entries, start, indent)
    nodes = []
    i = start
    while i < entries.size && entries[i][:indent] >= indent
      kind = entries[i][:text] =~ TASK_ITEM ? :task : (entries[i][:ordered] ? :ordered : :bullet)
      list_items = []
      while i < entries.size && entries[i][:indent] == indent && (kind_of(entries[i]) == kind)
        entry = entries[i]
        i += 1
        children, i = nested_for(entries, i, indent)
        list_items << item_node(entry, kind, children)
      end
      break if list_items.empty?
      nodes << list_node(kind, list_items)
    end
    [ nodes, i ]
  end

  def kind_of(entry)
    entry[:text] =~ TASK_ITEM ? :task : (entry[:ordered] ? :ordered : :bullet)
  end

  def nested_for(entries, i, indent)
    return [ [], i ] unless i < entries.size && entries[i][:indent] > indent
    build_list(entries, i, entries[i][:indent])
  end

  def item_node(entry, kind, children)
    if kind == :task
      body = TASK_ITEM.match(entry[:text])[2]
      task_id = TASK_COMMENT.match(body)&.[](1)&.to_i
      body = body.sub(TASK_COMMENT, "")
      # "checked" is the Markdown tick, for callers to apply to the task; it is not a document attribute.
      attrs = { "taskId" => task_id, "checked" => TASK_ITEM.match(entry[:text])[1] != " " }
      { "type" => "workspaceTaskItem", "attrs" => attrs, "content" => [ paragraph_node(body) ] }
    else
      { "type" => "listItem", "content" => [ paragraph_node(entry[:text]) ] + children }
    end
  end

  def list_node(kind, items)
    type = { task: "workspaceTaskList", ordered: "orderedList", bullet: "bulletList" }.fetch(kind)
    { "type" => type, "content" => items }
  end

  # Inline Markdown to text nodes with marks.
  def inline_nodes(text)
    nodes = []
    parse_inline(text.to_s, [], nodes)
    merge_text(nodes)
  end

  INLINE = [
    [ /\*\*(.+?)\*\*/, "bold" ], [ /__(.+?)__/, "bold" ], [ /~~(.+?)~~/, "strike" ], [ %r{<u>(.+?)</u>}, "underline" ],
    [ /(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/, "italic" ], [ /(?<![_\w])_(?!\s)(.+?)(?<!\s)_(?!\w)/, "italic" ]
  ].freeze

  def parse_inline(text, marks, out)
    until text.empty?
      candidates = []
      if (m = /`([^`]+)`/.match(text)) then candidates << [ m, :code ] end
      if (m = /!\[([^\]]*)\]\(([^)\s]+)\)/.match(text)) then candidates << [ m, :image ] end
      if (m = /\[([^\]]+)\]\(([^)\s]+)\)/.match(text)) then candidates << [ m, :link ] end
      INLINE.each { |pattern, mark| (m = pattern.match(text)) && candidates << [ m, mark ] }
      if (m = /  \n|\\\n/.match(text)) then candidates << [ m, :break ] end
      first = candidates.min_by { |m, _| m.begin(0) }
      return out << text_node(text, marks) unless first
      match, kind = first
      out << text_node(match.pre_match, marks) unless match.pre_match.empty?
      case kind
      when :code then out << text_node(match[1], marks + [ { "type" => "code" } ])
      when :image then out << { "type" => "image", "attrs" => { "src" => match[2], "alt" => match[1] } }
      when :link then parse_inline(match[1], marks + [ { "type" => "link", "attrs" => { "href" => match[2] } } ], out)
      when :break then out << { "type" => "hardBreak" }
      else parse_inline(match[1], marks + [ { "type" => kind } ], out)
      end
      text = match.post_match
    end
    out
  end

  def text_node(text, marks)
    node = { "type" => "text", "text" => text }
    node["marks"] = marks unless marks.empty?
    node
  end

  def merge_text(nodes)
    nodes.each_with_object([]) do |node, merged|
      last = merged.last
      if last && last["type"] == "text" && node["type"] == "text" && last["marks"] == node["marks"]
        last["text"] += node["text"]
      else
        merged << node
      end
    end
  end
end
