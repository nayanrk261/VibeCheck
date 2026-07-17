const mongoose = require('mongoose')

const findingSchema = new mongoose.Schema({
    title : {type : String, required : true },
    severity: {
        type : String,
        enum: ["CRITICAL","HIGH","MEDIUM","LOW","INFO"],
        required : true
    },
    category : {type : String, required : true},
    description : {type : String, required : true},
    fix : {type : String, required : true}
});

const submissionSchema = new mongoose.Schema({
    repoUrl : {type : String, required : true},
    liveUrl : {type : String, required : true},
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : false
    },
    scores : {
        security : {type : Number, default : 0},
        codeQuality : {type : Number, default : 0},
        uiUx : {type : Number, default : 0},
        performance : {type : Number, default : 0},
        overAll : {type : Number, default : 0}
    },
    findings: [findingSchema],
    isPublic: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("Submission",submissionSchema);