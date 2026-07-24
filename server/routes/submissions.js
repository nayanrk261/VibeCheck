const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");

router.get("/submissions/:id", async (req,res) => {
    try{
        const submission = await Submission.findById(req.params.id);

        if(!submission){
            return res.status(404).json({error : "Submission not found"});
        }
        res.status(200).json(submission);
    }catch(err){
        res.status(500).json({error  : err.message});
    }
})

module.exports = router;