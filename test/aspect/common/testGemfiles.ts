
export const gemnasiumGemfile = `source "https://rubygems.org"

gemspec

gem "coveralls", "~> 0.6", require: false
gem "rake", ">= 0.8.7"
gem "rspec", "~> 2.4"`;

export const adoptAHydrantGemfile = `source 'https://rubygems.org'
ruby '2.3.1'

gem 'rails', '~> 4.2.7'

gem 'arel'
gem 'devise'
gem 'geokit'
gem 'haml'
gem 'http_accept_language'
gem 'nokogiri'
gem 'pg'
gem 'rails_12factor'
gem 'rails_admin'
gem 'validates_formatting_of'

platforms :ruby_18 do
  gem 'fastercsv'
end

group :assets do
  gem 'sass-rails', '>= 4.0.3'
  gem 'uglifier'
end

group :development do
  gem 'spring'
end

group :production do
  gem 'puma'
  gem 'skylight'
end

group :test do
  gem 'coveralls', require: false
  gem 'rubocop'
  gem 'simplecov', require: false
  gem 'sqlite3'
  gem 'webmock'
end`;
