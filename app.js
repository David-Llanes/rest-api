const express = require('express')
const crypto = require('node:crypto')
const cors = require('cors')
const movies = require('./movies.json')
const { validateMovie, validatePartialMovie } = require('./schemas/movies')

/* ------------------ INICIALIZANDO APLICACION ----------------- */
const app = express()
app.disable('x-powered-by') // Header x-powered-by: Express

/* -------------------- MIDDLEWARE Y RUTAS -------------------- */
// Para arrgelar los problemas de CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const ACCEPTED_ORIGINS = [
        'http://localhost:8080',
        'http://localhost:3000',
        'https://movies.com',
        'https://midu.dev',
      ]
      if (ACCEPTED_ORIGINS.includes(origin)) {
        return callback(null, true)
      }

      if (!origin) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS...'))
    },
  })
)

// Para poder trabajar con req.body como un objeto
app.use(express.json())

app.use((req, res, next) => {
  console.log('A request has been received...')
  next()
})

app.all('/', (req, res, next) => {
  console.log('A request has been received at /')
  next()
})

app.get('/', (req, res) => {
  res.json({ message: 'Hola mundo' })
})

app.get('/movies', (req, res) => {
  // SE NECESITA AGREGAR CABECERAS PARA SOLUCIONAR CORS
  //res.header('Access-Control-Allow-Origin', '*')
  const { title, genre } = req.query

  if (title) {
    const filteredMovies = movies.filter(movie =>
      movie.title.toLowerCase().includes(title.toLowerCase())
    )
    if (filteredMovies) return res.json(filteredMovies)
  }

  if (genre) {
    const filteredMovies = movies.filter(movie =>
      movie.genre.some(g => g.toLowerCase() === genre.toLowerCase())
    )
    if (filteredMovies) return res.json(filteredMovies)
  }

  res.json(movies)
})

// Agregamos validaciones de datos con ZOD
app.post('/movies', (req, res) => {
  const result = validateMovie(req.body)

  if (result.error) {
    return res.status(422).json({ error: JSON.parse(result.error.message) })
  }

  // Aqui solo llegará si se validaron correctamente los datos
  const newMovie = {
    id: crypto.randomUUID,
    ...result.data,
  }

  // Agregar a la BD
  movies.push(newMovie)
  res.status(201).json(newMovie)
})

// Ocupamos app.options en la ruta que queremos habilitar el permiso y solucionar cors. Sirve parea CORS Preflight.
// Es necesario agregar estas dos cabeceras
// app.options('/movies/:id', (req, res) => {
//   res.header('Access-Control-Allow-Origin', '*')
//   res.header(
//     'Access-Control-Allow-Methods',
//     'GET, POST, PUT, PATCH, DELETE, HEAD'
//   )
//   // Podemos usar Access-Control-Request-Headers para indicarle que cabeceras podemos incluir en las peticiones subsecuentes, es decir, aquellas con los metodos permitidos

//   res.sendStatus(200) // Debe ser 200, para decirle al nevegador que SI puede proceder con la siguiente peticion. Si usamos 204 puede haber problemas.
// })

app.get('/movies/:id', (req, res) => {
  const { id } = req.params
  const movie = movies.find(movie => movie.id === id)
  if (movie) {
    return res.json(movie)
  }
  res.status(404).json({ message: 'Movie not found...' })
})

app.patch('/movies/:id', (req, res) => {
  const result = validatePartialMovie(req.body)

  if (result.error) {
    return res.status(400).json({ error: JSON.parse(result.error.message) })
  }

  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found...' })
  }

  const updateMovie = {
    ...movies[movieIndex],
    ...result.data,
  }

  movies[movieIndex] = updateMovie

  return res.json(updateMovie)
})

// Necesita la acbecera de Access-Control-Allow-Origin
app.delete('/movies/:id', (req, res) => {
  // res.header('Access-Control-Allow-Origin', '*')
  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' })
  }

  movies.splice(movieIndex, 1)

  return res.status(204).json({ message: 'Movie deleted' })
})

/* -------------------- MANEJO DE ERRORES ---------------------- */
// Manejar rutas que no existen
app.use(function (req, res, next) {
  res.status(404).send('Sorry cant find that!')
})

// Manejar errores. Por ejemplo, si alguno de nuestros handlers usa Throw new error al cumplir cierta condicion
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

/* ------------------- LEVANTANDO SERVIDOR --------------------- */
const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
