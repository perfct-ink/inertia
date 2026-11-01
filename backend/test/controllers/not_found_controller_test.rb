require "test_helper"

class NotFoundControllerTest < ActionDispatch::IntegrationTest
  test "an unknown API path is a JSON 404" do
    get "/api/v1/nope"

    assert_response :not_found
    assert_equal "application/json", response.media_type
    assert_equal({ "error" => "Not found" }, response.parsed_body)
  end

  test "the JSON 404 does not depend on the Accept header or the verb" do
    get "/api/v1/nope/deeper", headers: { "Accept" => "text/html" }
    assert_response :not_found
    assert_equal "application/json", response.media_type

    delete "/api/anything.php"
    assert_response :not_found
    assert_equal "application/json", response.media_type
  end

  test "known API routes are not swallowed by the catch-all" do
    get "/api/v1/tasks"

    assert_response :unauthorized
  end
end
