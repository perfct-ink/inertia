namespace :db do
  desc "Copy the old MySQL database into an empty PostgreSQL one (once; see app/services/mysql_import.rb)"
  task import_mysql: :environment do
    MysqlImport.new.run
  end
end
