module Formula
  # Turns formula text into a tree. The same language, and the same error
  # codes and messages, as `parseExpression` in frontend/src/util/expression.ts;
  # change both together (frontend/src/util/expression.vectors.json holds the
  # cases both must pass).
  #
  #   {Price} * {Quantity}      IF({Done}, "yes", "no")      ROUND({Total} / 3, 2)
  #
  # Operators follow Excel's precedence, tightest first: unary minus, ^ (left
  # to right), * /, + -, & (join text), then the comparisons = <> < <= > >=.
  # Text is in "double quotes" ("" inside means a quote).
  class Parser
    Number = Data.define(:value)
    Text = Data.define(:value)
    Bool = Data.define(:value)
    Ref = Data.define(:name)
    Unary = Data.define(:op, :arg)
    Binary = Data.define(:op, :left, :right)
    Call = Data.define(:name, :args)

    Token = Struct.new(:kind, :text, :pos)

    NUMBER = /\G(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i
    WORD = /\G[A-Za-z_][A-Za-z0-9_.]*/
    COMPARISONS = %w[<> <= >= !=].freeze
    OPERATORS = "+-*/^&=<>(),".freeze

    def self.parse(source)
      new(source).parse
    end

    # The distinct field names a parsed formula refers to, in order of appearance.
    def self.references(node)
      case node
      when Ref then [ node.name ]
      when Unary then references(node.arg)
      when Binary then (references(node.left) + references(node.right)).uniq
      when Call then node.args.flat_map { |arg| references(arg) }.uniq
      else []
      end
    end

    def initialize(source)
      @source = source
    end

    def parse
      raise Error.new("#ERROR!", "The formula is empty") if Values.js_trim(@source).empty?
      @tokens = tokenize
      @at = 0
      root = comparison
      raise unexpected(peek) unless peek.kind == :end
      root
    end

    private

    # ----- Tokens

    # Positions are counted in characters while reading and shown in UTF-16
    # units, as the browser counts them.
    def error_at(code, message, pos)
      Error.new(code, "#{message} (at character #{Values.utf16_offset(@source, pos) + 1})")
    end

    def parse_error(message, pos)
      error_at("#ERROR!", message, pos)
    end

    def tokenize
      tokens = []
      i = 0
      while i < @source.length
        ch = @source[i]
        if Values::JS_SPACE.match?(ch)
          i += 1
        elsif ch.match?(/[0-9.]/)
          match = NUMBER.match(@source, i)
          raise parse_error("Unexpected \"#{ch}\"", i) unless match
          raise error_at("#NUM!", "The number #{match[0]} is too large", i) unless Values.parse_number(match[0]).finite?
          tokens << Token.new(:number, match[0], i)
          i += match[0].length
        elsif ch == '"'
          text, stop = read_text(i)
          tokens << Token.new(:text, text, i)
          i = stop
        elsif ch == "{"
          close = @source.index("}", i)
          raise parse_error("A field name is missing its closing }", i) unless close
          name = Values.js_trim(@source[(i + 1)...close])
          raise parse_error("A field name between { } is empty", i) if name.empty?
          tokens << Token.new(:ref, name, i)
          i = close + 1
        elsif ch.match?(/[A-Za-z_]/)
          word = WORD.match(@source, i)[0]
          tokens << Token.new(:name, word, i)
          i += word.length
        elsif COMPARISONS.include?(@source[i, 2])
          op = @source[i, 2]
          tokens << Token.new(:op, op == "!=" ? "<>" : op, i)
          i += 2
        elsif OPERATORS.include?(ch)
          tokens << Token.new(:op, ch, i)
          i += 1
        else
          raise parse_error("Unexpected \"#{ch}\"", i)
        end
      end
      tokens << Token.new(:end, "", @source.length)
    end

    # The text between the quotes that open at start, and the index after the closing quote.
    def read_text(start)
      text = +""
      j = start + 1
      loop do
        raise parse_error("Text is missing its closing quote", start) if j >= @source.length
        if @source[j] == '"'
          break unless @source[j + 1] == '"'
          text << '"'
          j += 2
        else
          text << @source[j]
          j += 1
        end
      end
      [ text, j + 1 ]
    end

    # ----- Grammar

    def peek
      @tokens[@at]
    end

    def advance
      token = @tokens[@at]
      @at += 1
      token
    end

    def op?(*ops)
      peek.kind == :op && ops.include?(peek.text)
    end

    def unexpected(token)
      token.kind == :end ? parse_error("The formula ends too early", token.pos) : parse_error("Unexpected \"#{token.text}\"", token.pos)
    end

    def binary_level(operators, deeper)
      left = send(deeper)
      while op?(*operators)
        op = advance.text
        left = Binary.new(op, left, send(deeper))
      end
      left
    end

    def comparison = binary_level(%w[= <> < <= > >=], :concat)
    def concat = binary_level(%w[&], :additive)
    def additive = binary_level(%w[+ -], :term)
    def term = binary_level(%w[* /], :power)
    def power = binary_level(%w[^], :unary)

    def unary
      return primary unless op?("-", "+")
      op = advance.text
      Unary.new(op, unary)
    end

    def arguments
      list = []
      return list if op?(")")
      loop do
        list << comparison
        return list unless op?(",")
        @at += 1
      end
    end

    def call(token)
      name = token.text.upcase
      spec = Functions::TABLE[name]
      raise Error.new("#NAME?", "There is no function called #{token.text}") unless spec
      @at += 2 # the name and its (
      list = arguments
      raise unexpected(peek) unless op?(")")
      @at += 1
      unless list.length.between?(spec.min, spec.max)
        count = spec.min == spec.max ? spec.min.to_s : (spec.max == Float::INFINITY ? "at least #{spec.min}" : "#{spec.min} to #{spec.max}")
        noun = (spec.max == Float::INFINITY ? spec.min : spec.max) == 1 ? "value" : "values"
        raise Error.new("#ERROR!", "#{name} needs #{count} #{noun}, not #{list.length}")
      end
      Call.new(name, list)
    end

    def primary
      token = peek
      case token.kind
      when :number
        @at += 1
        Number.new(Values.parse_number(token.text))
      when :text
        @at += 1
        Text.new(token.text)
      when :ref
        @at += 1
        Ref.new(token.text)
      when :name
        return call(token) if @tokens[@at + 1].kind == :op && @tokens[@at + 1].text == "("
        @at += 1
        upper = token.text.upcase
        return Bool.new(upper == "TRUE") if %w[TRUE FALSE].include?(upper)
        raise Error.new("#NAME?", "\"#{token.text}\" is not a function. Write field names in braces, like {#{token.text}}")
      else
        raise unexpected(token) unless op?("(")
        @at += 1
        inner = comparison
        raise unexpected(peek) unless op?(")")
        @at += 1
        inner
      end
    end
  end
end
