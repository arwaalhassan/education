

const express = require('express');

const cors = require('cors');
const bodyParser =require('body-parser');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const trainerRoutes = require('./routes/trainers');
const trainingRoutes = require('./routes/training');
const educationRoutes = require('./routes/education');
const islamicRoutes = require('./routes/islamic');
const hallsRoutes = require('./routes/halls');
const announcementsRoutes = require('./routes/announcements');
const app = express();
const linksRoutes = require('./routes/linksRoutes');


app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/trainers', trainerRoutes);
app.use('/training', trainingRoutes);
app.use('/education', educationRoutes);
app.use('/islamic', islamicRoutes);
app.use('/halls', hallsRoutes);
app.use('/announcements', announcementsRoutes);
app.use('/links', linksRoutes);


app.listen(3000, '0.0.0.0', () => {
    console.log('ok');
});
