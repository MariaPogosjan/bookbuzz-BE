import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import listEndpoints from 'express-list-endpoints'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/bookbuzz"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const userSchema = mongoose.Schema({
  username: {
    type: String, 
    required: true,
    minlength: [5, 'The username should be at least 5 characters, {VALUE}'], 
    maxlength: [20, 'The username should no more than 12 characters, {VALUE}'], 
    unique: [true, 'The username has already been used'],
    trim: true
  }, 
  email: {
    type: String,
    required: true,
    unique: [true, 'The email has already been used'],
    trim: true,
    validation: {
      validator: (value) => {
        return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value)
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String, 
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const User = mongoose.model('User', userSchema) 

const port = process.env.PORT || 8080
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

app.post('/user', async (req, res) => {
  const { username, email, password } = req.body

  try {
    const salt = bcrypt.genSaltSync()
    const newUser = await new User({
      username,
      email, 
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.json({
      success: true, 
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email, 
      accessToken: newUser.accessToken
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not create user", 
      error
    })
  }
})

app.post('/sessions', async (req, res) => {
  const { usernameOrEmail, password } = req.body 

  try {
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail } 
      ]
    })
    console.log(user)
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({
        success: true,
        userId: user._id,
        username: user.username, 
        accessToken: user.accessToken
      })
    } else {
      res.status(404).json({ success: false, message: 'User not found' })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid request', 
      error
    })
  }
}) 

app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`)
})