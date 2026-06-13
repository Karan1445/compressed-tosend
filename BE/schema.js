const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./schema');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const uri = "mongodb+srv://karangohel_db_user:Karan8141@cluster0.oodok9z.mongodb.net/myFirstDatabase?appName=Cluster0";

mongoose.connect(uri)
    .then(() => {
        console.log("Mongo Booted UP!");

        app.post("/users", async (req, res) => {
            try {
                const newUser = new User(req.body);
                const savedUser = await newUser.save();
                res.status(201).json(savedUser);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.get("/users", async (req, res) => {
            try {
                const data = await User.find();
                res.json(data);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch data" });
            }
        });

        app.get("/users/:id", async (req, res) => {
            try {
                const data = await User.findById(req.params.id);
                if (!data) return res.status(404).json({ error: "User not found" });
                res.json(data);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.put("/users/:id", async (req, res) => {
            try {
                const updatedUser = await User.findByIdAndUpdate(
                    req.params.id,
                    req.body,
                    { new: true, runValidators: true }
                );
                if (!updatedUser) return res.status(404).json({ error: "User not found" });
                res.json(updatedUser);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.delete("/users/:id", async (req, res) => {
            try {
                const deletedUser = await User.findByIdAndDelete(req.params.id);
                if (!deletedUser) return res.status(404).json({ error: "User not found" });
                res.json({ message: "User deleted successfully" });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.listen(8888, () => {
            console.log("Server is up and thriving on port 8888!");
        });

    })
    .catch((error) => {
        console.log(" DB Connection error:", error);
    });
