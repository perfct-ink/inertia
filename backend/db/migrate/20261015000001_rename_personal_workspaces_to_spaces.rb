# Workspaces are called "Spaces" in the product. Personal workspaces were
# auto-named "<name>'s Workspace"; rename the ones nobody has renamed.
class RenamePersonalWorkspacesToSpaces < ActiveRecord::Migration[7.2]
  def up
    execute <<~SQL
      UPDATE workspaces SET name = CONCAT(LEFT(name, CHAR_LENGTH(name) - CHAR_LENGTH('Workspace')), 'Space')
      WHERE personal = TRUE AND name LIKE '%''s Workspace'
    SQL
  end

  def down
    execute <<~SQL
      UPDATE workspaces SET name = CONCAT(LEFT(name, CHAR_LENGTH(name) - CHAR_LENGTH('Space')), 'Workspace')
      WHERE personal = TRUE AND name LIKE '%''s Space'
    SQL
  end
end
