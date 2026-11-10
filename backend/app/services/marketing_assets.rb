# The marketing pages' stylesheet and script (app/marketing_assets/), served by
# MarketingController#asset at a URL that carries a digest of the file, so the
# browser can cache them for a year and a changed file gets a new address. Rails
# here is API-only, with no asset pipeline, so this is the whole mechanism.
module MarketingAssets
  DIR = Rails.root.join("app/marketing_assets")
  TYPES = { "css" => "text/css", "js" => "text/javascript" }.freeze
  DIGEST_LENGTH = 12

  @digests = Concurrent::Map.new

  class << self
    # "/marketing-1a2b3c4d5e6f.css" for "css".
    def path(extension)
      "/marketing-#{digest(extension)}.#{extension}"
    end

    # The file at that digest, or nil when the digest is not the current one.
    def file_for(digest, extension)
      return unless TYPES.key?(extension)

      file(extension) if digest == digest(extension)
    end

    private

    def file(extension)
      DIR.join("marketing.#{extension}")
    end

    # Recomputed when the file changes, so development edits take effect.
    def digest(extension)
      file = file(extension)
      key = [ extension, file.mtime.to_f ]
      @digests.compute_if_absent(key) { Digest::SHA256.file(file).hexdigest[0, DIGEST_LENGTH] }
    end
  end
end
