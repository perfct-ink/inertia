module Formula
  # Something wrong with a formula or with the values it works on. code is the
  # short spreadsheet-style label (#DIV/0!); the message says what is wrong in
  # words. Same as FormulaError in frontend/src/util/expression.ts.
  class Error < StandardError
    attr_reader :code

    def initialize(code, message)
      super(message)
      @code = code
    end
  end
end
