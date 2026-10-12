class Workspace < ApplicationRecord
  belongs_to :user
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders
  has_many :tasks, dependent: :destroy
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :destroy
  has_many :initiatives, dependent: :destroy
  has_many :quip_imports, dependent: :destroy

  validates :name, presence: true
end
