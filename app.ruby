require 'rubygems'
require 'sinatra'

get '/inbound' do
  content_type 'text/xml'
  '<Response><Message>You did it, you big dingo!</Message></Response>'
end
