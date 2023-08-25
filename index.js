const express = require('express')
const cors = require('cors')
require('dotenv').config()
const SSLCommerzPayment = require('sslcommerz-lts')
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    // console.log('authorization', authorization)
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access 1' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
    // console.log('token', token)
    jwt.verify(token, process.env.JWT_ACCESS_TOCKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access 2' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = "mongodb+srv://meherafkabir:3U2k0ntndS1aWYjW@cluster0.xbnpghv.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const store_id = 'mahfu6489295dc3a92'
const store_passwd = 'mahfu6489295dc3a92@ssl'
const is_live = false //true for live, false for sandbox

async function run() {
    try {
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const userscollection = client.db("doctors_data").collection("users");
        const Doctorscollection = client.db("doctors_data").collection("Our-Doctors");
        const PostsCollection = client.db("doctors_data").collection("posts");
        const SelectedDoctorcollection = client.db("doctors_data").collection("selectdoctors");
        const paymentCollection = client.db("doctors_data").collection("payments");
        const bloodCollection = client.db("doctors_data").collection("blood");
        const medicineCollection = client.db("doctors_data").collection("medicine");


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            // console.log('decoded email from verify admin', email)
            const query = { email: email }
            const user = await userscollection.findOne(query);
            if (user?.role !== 'admin') {
                console.log('se admin na')
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOCKEN, { expiresIn: '30h' })
            res.send({ token })
        })
        app.post('/users', async (req, res) => {
            const users = req.body;
            const query = { email: users.email }
            const existingUser = await userscollection.findOne(query);
            // console.log("existing", existingUser)
            if (existingUser) {
                console.log('ai user ase')
                return res.send({ mssage: 'user Is already exists' })
            }
            const result = await userscollection.insertOne(users);
            res.send(result)
        })
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userscollection.find().toArray()
            res.send(result)
        })
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const user = await userscollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })
        app.get('/users/doctor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ doctor: false })
            }

            const query = { email: email }
            const user = await userscollection.findOne(query);
            const result = { doctor: user?.role === 'doctor' }
            console.log('doctor', result)
            res.send(result);
        })

        app.get('/ourdoctors', async (req, res) => {
            const result = await Doctorscollection.find().toArray();
            res.send(result)
        })
        app.get("/doctorBySearch/:text", async (req, res) => {
            const text = req.params.text;
            const result = await Doctorscollection
                .find({
                    $or: [
                        { name: { $regex: text, $options: "i" } },
                    ],
                })
                .toArray();
            console.log(result)
            res.send(result);
        });
        app.get('/populardoctors', async (req, res) => {
            const result = await Doctorscollection.find().sort({ rating: -1 }).toArray();
            res.send(result)
        })
        app.post('/ourdoctors', async (req, res) => {
            const doctor = req.body;
            const result = await Doctorscollection.insertOne(doctor);
            res.send(result)
        })
        app.post('/addblood', async (req, res) => {
            console.log(req.body)
            const data = req.body;
            const result = await bloodCollection.insertOne(data);
            res.send(result)
        })
        app.post('/addmedicine', async (req, res) => {
            console.log(req.body)
            const data = req.body;
            const result = await medicineCollection.insertOne(data);
            res.send(result)
        })
        app.get('/blood', async (req, res) => {
            const result = await bloodCollection.find().toArray();
            res.send(result)
        })
        app.get("/bloodBySearch/:text", async (req, res) => {
            const text = req.params.text;
            const result = await bloodCollection
                .find({
                    $or: [
                        { blood: { $regex: text, $options: "i" } },
                    ],
                })
                .toArray();
            console.log(result)
            res.send(result);
        });
        app.get('/medicine', async (req, res) => {
            console.log('5000')
            const result = await medicineCollection.find().toArray();
            res.send(result)
        })
        app.get("/medicineBySearch/:text", async (req, res) => {
            const text = req.params.text;
            const result = await medicineCollection
                .find({
                    $or: [
                        { name: { $regex: text, $options: "i" } },
                    ],
                })
                .toArray();
            console.log(result)
            res.send(result);
        });
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) };

            const updateDoc = { $set: { role: "admin" } };
            const result = await userscollection.updateOne(filter, updateDoc)
            // console.log('result', result)
            res.send(result)
        })
        app.patch('/users/doctor/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) };

            const updateDoc = { $set: { role: "doctor" } };
            const result = await userscollection.updateOne(filter, updateDoc)
            // console.log('result', result)
            res.send(result)
        })
        app.post('/newpost', async (req, res) => {
            const Newpost = req.body;
            const result = await PostsCollection.insertOne(Newpost)
            res.send(result)
        })
        app.get('/allposts', async (req, res) => {
            const filter = { status: "approved" }
            const result = await PostsCollection.find(filter).toArray()
            res.send(result)
        })
        app.get('/pendingpost', async (req, res) => {
            const filter = { status: "Pending" }
            const result = await PostsCollection.find(filter).toArray()
            res.send(result)
        })
        app.patch('/approvepost/:id', async (req, res) => {
            const id = req.params.id;
            console.log('update post', id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: "approved" } };
            const result = await PostsCollection.updateOne(filter, updateDoc)
            // console.log('result', result)
            res.send(result)
        })
        app.patch('/denypost/:id', async (req, res) => {
            const id = req.params.id;
            console.log('deny post', id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: "denied" } };
            const result = await PostsCollection.updateOne(filter, updateDoc)
            // console.log('result', result)
            res.send(result)
        })
        app.get('/myposts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { doctor_email: email };
            const result = await PostsCollection.find(query).toArray();
            res.send(result)
        })
        app.delete('/post/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await PostsCollection.deleteOne(query);
            // console.log(result)
            res.send(result)
        })


        // unpaid booking api 
        app.get('/selectedoctors/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { patient: email, payment_status: 'unpaid' };
            const result = await SelectedDoctorcollection.find(query).toArray();
            // console.log(result)
            res.send(result)
        })
        // paid booking api 
        app.get('/bookedpost/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { patient: email, payment_status: 'paid' };
            const result = await SelectedDoctorcollection.find(query).toArray();
            res.send(result)
        })
        app.post('/selectdoctor', async (req, res) => {
            const course = req.body;
            const result = await SelectedDoctorcollection.insertOne(course);
            res.send(result)

        })
        app.delete('/selectedoctors/:id', async (req, res) => {
            const id = req.params.id;
            // console.log('hit delete', id)
            const query = { _id: new ObjectId(id) };
            const result = await SelectedDoctorcollection.deleteOne(query);
            res.send(result)
        })
        

        // SSL payment 
        const tran_id = new ObjectId().toString();

        app.post('/visitpayment', async (req, res) => {
            const paymentInfo = req.body;
            // console.log('paymentInfo email', paymentInfo)

            if (paymentInfo.doctor) {
                console.log('doctor', paymentInfo)
                const data = {
                    total_amount: paymentInfo.payableAmount,
                    currency: 'BDT',
                    tran_id: tran_id, // use unique tran_id for each api call
                    success_url: `https://doctors-server-update.vercel.app/payment/success/${tran_id}`,
                    fail_url: 'https://doctors-server-update.vercel.app/payment/fail',
                    cancel_url: 'https://doctors-server-update.vercel.app/payment/fail',
                    ipn_url: 'http://localhost:3030/ipn',
                    shipping_method: 'Courier',
                    product_name: 'Computer.',
                    product_category: 'Electronic',
                    product_profile: 'general',
                    cus_name: paymentInfo.Paitent_Name,
                    cus_email: paymentInfo.Patient_Email,
                    cus_add1: 'Dhaka',
                    cus_add2: 'Dhaka',
                    cus_city: 'Dhaka',
                    cus_state: 'Dhaka',
                    cus_postcode: '1000',
                    cus_country: 'Bangladesh',
                    cus_phone: '01711111111',
                    cus_fax: '01711111111',
                    ship_name: 'Customer Name',
                    ship_add1: 'Dhaka',
                    ship_add2: 'Dhaka',
                    ship_city: 'Dhaka',
                    ship_state: 'Dhaka',
                    ship_postcode: 1000,
                    ship_country: 'Bangladesh',
                };
                const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
                sslcz.init(data).then(apiResponse => {
                    // Redirect the user to payment gateway
                    let GatewayPageURL = apiResponse.GatewayPageURL
                    res.send({ url: GatewayPageURL })
                    console.log('Redirecting to: ', GatewayPageURL)
                });
                app.post('/payment/success/:tran_id', async (req, res) => {
                    // console.log(req.params.tran_id)
                    // set payment id in mongodb
                    const paymentHistory = {
                        Paitent_Name: paymentInfo.Paitent_Name,
                        Patient_Email: paymentInfo.Patient_Email,
                        bookingID: paymentInfo.bookingID,
                        doctor: paymentInfo.doctor,
                        payableAmount: paymentInfo.payableAmount,
                        specilest: paymentInfo.specilest,
                        visit_Time: paymentInfo.visit_Time,
                        tran_id: tran_id
                    }
                    // insert payment history 
                    const insertPaymentHistory = await paymentCollection.insertOne(paymentHistory);

                    // update bookingSerial 

                    // res.send({updateResult,})
                    res.redirect(`https://fastidious-puppy-c88c07.netlify.app/dashbord/payment/successful/${tran_id}`)
                })


                app.post('/payment/fail', async (req, res) => {
                    res.redirect('https://fastidious-puppy-c88c07.netlify.app/dashbord/payment/fail')
                })
            }

            // for medicine 

            if (paymentInfo.price_per_unit) {
                console.log('paymentInfo price_per_unit', paymentInfo)

                const data = {
                    total_amount: paymentInfo.price_per_unit,
                    currency: 'BDT',
                    tran_id: tran_id, // use unique tran_id for each api call
                    success_url: `https://doctors-server-update.vercel.app/payment/success/${tran_id}`,
                    fail_url: 'https://doctors-server-update.vercel.app/payment/fail',
                    cancel_url: 'https://doctors-server-update.vercel.app/payment/fail',
                    ipn_url: 'http://localhost:3030/ipn',
                    shipping_method: 'Courier',
                    product_name: 'Computer.',
                    product_category: 'Electronic',
                    product_profile: 'general',
                    cus_name: paymentInfo.Paitent_Name,
                    cus_email: paymentInfo.Patient_Email,
                    cus_add1: 'Dhaka',
                    cus_add2: 'Dhaka',
                    cus_city: 'Dhaka',
                    cus_state: 'Dhaka',
                    cus_postcode: '1000',
                    cus_country: 'Bangladesh',
                    cus_phone: '01711111111',
                    cus_fax: '01711111111',
                    ship_name: 'Customer Name',
                    ship_add1: 'Dhaka',
                    ship_add2: 'Dhaka',
                    ship_city: 'Dhaka',
                    ship_state: 'Dhaka',
                    ship_postcode: 1000,
                    ship_country: 'Bangladesh',
                };
                const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
                sslcz.init(data).then(apiResponse => {
                    // Redirect the user to payment gateway
                    let GatewayPageURL = apiResponse.GatewayPageURL
                    res.send({ url: GatewayPageURL })
                    console.log('Redirecting to: ', GatewayPageURL)
                });



                app.post('/payment/success/:tran_id', async (req, res) => {
                    // console.log(req.params.tran_id)
                    // set payment id in mongodb
                    const paymentHistory = {
                        Paitent_Name: paymentInfo.Paitent_Name,
                        Patient_Email: paymentInfo.Patient_Email,
                        name: paymentInfo.name,
                        price_per_unit: paymentInfo.price_per_unit,
                        group: paymentInfo.group,
                        purpose: paymentInfo.purpose,
                        company: paymentInfo.company,
                        expire_date: paymentInfo.expire_date,
                        tran_id: tran_id
                    }
                    console.log('paymentHistory', paymentHistory)
                    // console.log('paymentHistory', paymentHistory)
                    // insert payment history 
                    const insertPaymentHistory = await paymentCollection.insertOne(paymentHistory);

                    // update bookingSerial 


                    // res.send({updateResult,})
                    res.redirect(`https://fastidious-puppy-c88c07.netlify.app/dashbord/payment/successful/${tran_id}`)
                })

                app.post('/payment/fail', async (req, res) => {
                    res.redirect('https://fastidious-puppy-c88c07.netlify.app/dashbord/payment/fail')
                })
            }

        })


        app.patch('/paymentsuccess/:bookingID', async (req, res) => {
            const bookingID = req.params.bookingID;
            const Paymentfilter = { bookingID: bookingID };
            const paymentUpdateDoc = { $set: { payment_status: "paid" } };
            const updateResult = await SelectedDoctorcollection.updateOne(Paymentfilter, paymentUpdateDoc)
            console.log('updateResult', updateResult, paymentUpdateDoc)
            res.send(updateResult)
        })
        app.patch('/changeSerial/:bookingID', async (req, res) => {
            const bookingID = req.params.bookingID;
            // console.log('bookingID', bookingID)
            const filter = { _id: new ObjectId(bookingID) };
            // console.log('filter', filter)
            const bookingPost = await PostsCollection.findOne(filter);
            // console.log('bookingPost', bookingPost)
            const updateDoc = {
                $set:
                    { serial: bookingPost.serial - 1, bookingPatient: parseInt(bookingPost.bookingPatient) + 1 }
            };
            // console.log('updateDoc', updateDoc)
            const updateResult = await PostsCollection.updateOne(filter, updateDoc)
            // console.log('updateResult' , updateDoc)
            res.send(updateResult)
        })



        app.get('/paymenthistory', async (req, res) => {
            const result = await paymentCollection.find().toArray()
            res.send(result)
        })

        app.patch('/review/:id', async (req, res) => {
            const id = req.params.id;
            const review = req.body
            // console.log(req.body)
            // console.log(id);
            const fitter = { _id: new ObjectId(id) }
            const updateDoc = { $set: { rating: review } };
            const result = await PostsCollection.updateOne(fitter, updateDoc);
            // console.log(result)
            res.send(result)
        })
    } finally {
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('All Doctors Data Is Here')
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})