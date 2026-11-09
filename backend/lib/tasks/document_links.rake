namespace :document_links do
  desc "Record which documents link to which for documents saved before backlinks existed (safe to run again)"
  task rebuild: :environment do
    DocumentLink.rebuild_all!
    puts "Document links: #{DocumentLink.count}"
  end
end
