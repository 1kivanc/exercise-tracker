const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});


app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    }

    const newExercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: req.body.date ? new Date(req.body.date) : new Date()
    });

    const savedExercise = await newExercise.save();
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    }

    let dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    let filter = { userId: userId };
    if (from || to) {
      filter.date = dateFilter;
    }

    let exercises = await Exercise.find(filter).limit(parseInt(limit)).exec();

    exercises = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
