namespace :db do
  desc "Copy the old MySQL database into an empty Postgres database, once (app/services/mysql_import.rb)"
  task import_mysql: :environment do
    MysqlImport.boot
  end
end
