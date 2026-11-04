# The predictable development login (also created by db/seeds.rb). Run on dev boot.
User.find_or_create_by!(email: "test@example.com") do |u|
  u.name = "Test User"
  u.password = "password123"
end
