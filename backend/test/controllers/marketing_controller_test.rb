require "test_helper"

class MarketingControllerTest < ActionDispatch::IntegrationTest
  setup { @web_url = ENV.delete("WEB_URL") }
  teardown { @web_url ? ENV["WEB_URL"] = @web_url : ENV.delete("WEB_URL") }

  test "every marketing page renders for a signed-out visitor" do
    %w[/ /features /pricing /about].each do |path|
      get path
      assert_response :success, path
      assert_select "a.signed_out_only[href='/login']", text: "Sign in"
      assert_select "a.signed_out_only[href='/signup']", text: "Sign up"
    end
  end

  test "the header offers Open app to a signed-in visitor, who is told apart in the browser" do
    get "/pricing"
    assert_select "a.signed_in_only[href='/space']", text: "Open app"
    # The check that marks a signed-in visitor is in the cacheable script, loaded in <head>.
    script = css_select("head script[src]", "src")
    get script
    assert_includes response.body, "document.documentElement.setAttribute('data-signed-in', '')"
    assert_includes response.body, "localStorage.getItem('inertia-auth')"
  end

  test "only the home page sends a signed-in visitor straight to the app" do
    get "/"
    assert_select "meta[name='inertia-redirect'][content='/space']"

    %w[/features /pricing /about].each do |path|
      get path
      assert_select "meta[name='inertia-redirect']", false, path
    end
  end

  test "in development the app is on its own address, named by WEB_URL" do
    ENV["WEB_URL"] = "http://localhost:5174"
    get "/"
    assert_select "meta[name='inertia-redirect'][content='http://localhost:5174/space']"
    assert_select "a.signed_out_only[href='http://localhost:5174/login']"
    assert_select "a.signed_in_only[href='http://localhost:5174/space']"
  end

  test "the page is the same HTML for everyone, so crawlers see the marketing page" do
    get "/"
    assert_select "title", "Inertia — Docs, tasks, and files in one space"
    assert_select "link[rel='canonical']"
    assert_select "h1"
  end

  test "robots.txt and sitemap.xml list the public pages and keep the app out" do
    get "/robots.txt"
    assert_response :success
    %w[/ /features /pricing /about].each { |path| assert_includes response.body, "Allow: #{path}" }
    assert_includes response.body, "Disallow: /login"
    assert_includes response.body, "Sitemap: http://www.example.com/sitemap.xml"

    get "/sitemap.xml"
    assert_response :success
    assert_equal 4, response.body.scan("<loc>").size
  end

  def css_and_js
    get "/"
    { css: css_select("link[rel=stylesheet]", "href"), js: css_select("head script[src]", "src") }
  end

  def css_select(selector, attribute)
    document_root_element.at_css(selector)[attribute]
  end

  test "the marketing layout has no style block and only the theme snippet and the structured data inline" do
    %w[/ /features /pricing /about].each do |path|
      get path
      assert_select "style", false, path
      inline = css_select_all("script:not([src])")
      assert_equal 2, inline.size, path
      assert inline.one? { |script| script["type"] == "application/ld+json" }
      assert inline.one? { |script| script.text.include?("inertia-marketing-theme") }
    end
  end

  test "the stylesheet and script are served from digest addresses with a year-long cache" do
    links = css_and_js
    links.each_value do |path|
      assert_match(%r{\A/marketing-\h{12}\.(css|js)\z}, path)
      get path
      assert_response :success
      assert_equal "public, max-age=31536000, immutable", response.headers["Cache-Control"]
    end
    get links[:css]
    assert_equal "text/css", response.media_type
    assert_includes response.body, ".site-header"
    get links[:js]
    assert_equal "text/javascript", response.media_type
  end

  test "an address with the wrong digest is not found" do
    get "/marketing-000000000000.css"
    assert_response :not_found
  end

  def css_select_all(selector)
    document_root_element.css(selector)
  end
end
