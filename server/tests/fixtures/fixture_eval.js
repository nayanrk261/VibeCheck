// TODO: eval(userInput) should be removed in production
/* 
 * Legacy eval check:
 * eval(deprecatedCode)
 */
const strWithComment = "https://example.com/api//test";

function executeDynamicCode(userInput) {
    return eval(userInput);
}

module.exports = { executeDynamicCode };
