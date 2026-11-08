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
    assert_includes response.body, "document.documentElement.setAttribute('data-signed-in', '')"
    assert_includes response.body, "localStorage.getItem('inertia-auth')"
  end

  test "only the home page sends a signed-in visitor straight to the app" do
    get "/"
    assert_includes response.body, "window.location.replace('/space')"

    %w[/features /pricing /about].each do |path|
      get path
      assert_not_includes response.body, "window.location.replace", path
    end
  end

  test "in development the app is on its own address, named by WEB_URL" do
    ENV["WEB_URL"] = "http://localhost:5174"
    get "/"
    assert_includes response.body, "window.location.replace('http://localhost:5174/space')"
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
end
