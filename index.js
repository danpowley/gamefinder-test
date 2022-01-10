const express = require('express')
var bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || 3000

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(express.static('public'))
app.use(bodyParser.json()) // parse application/json

app.get('/available', (req, res) => {
  res.send({
    available: true
  })
})

// index page
app.get('/', function(req, res) {
  res.render('pages/index');
});

app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`)
})