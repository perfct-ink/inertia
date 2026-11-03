# A share link can stop working on a date. No date (the default, and every link
# made before this) means it works until it is revoked.
class AddExpiresAtToShares < ActiveRecord::Migration[7.2]
  def change
    add_column :shares, :expires_at, :datetime
  end
end
