require 'rubygems'
require 'sinatra'

get '/voice' do
  content_type 'text/xml'
  '<Response><Dial callerId="+13182576018">+13236211433</Dial></Response>'
end
