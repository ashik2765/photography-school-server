const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

//mongoDb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nkuq19p.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const usersCollection = client.db("campDB").collection("users");
    const classesCollection = client.db("campDB").collection("classes");
    const instructorCollection = client.db("campDB").collection("instructor");
    const cartCollection = client.db("campDB").collection("carts");

    //JWT api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })
    //users apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const UserAllreadyExist = await usersCollection.findOne(query);
      if (UserAllreadyExist) {
        return res.send({ message: 'I am already here' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    //make admin and instructor api
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({admin:false})
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({
          instructor:false})
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })


    app.patch('/users/:role/:id', async (req, res) => {
      const role = req.params.role;
      const id = req.params.id;

      try {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { role } };

        const result = await usersCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount) {
          res.json({ success: true });
        } else {
          res.json({ success: false, message: 'Failed to update user role' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred' });
      }
    });


    //apis
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })

    // app.post('/classes', async (req, res) => {
    //   const { className, classImage, availableSeats, price } = req.body;
    //   const instructor = req.user; 

    //   const newClass = {
    //     className,
    //     classImage,
    //     instructorName: instructor.displayName,
    //     instructorEmail: instructor.email,
    //     availableSeats,
    //     price,
    //     status: 'pending'
    //   };

    //   try {
    //     const result = await classesCollection.insertOne(newClass);
    //     res.json({ success: true, message: 'Class added successfully' });
    //   } catch (error) {
    //     res.status(500).json({ success: false, message: 'Failed to add class' });
    //   }
    // });


    app.get('/instructor', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })


    //added cart collection
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result)
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);

    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('summer camp server is running')
})

app.listen(port, () => {
  console.log(`summer camp is running on port${port}`);
})