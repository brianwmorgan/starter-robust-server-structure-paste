const express = require("express");
const app = express();
const pastes = require("./data/pastes-data");

app.use(express.json());

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// In the previous lesson, you followed RESTful design principles to create your API.
// Another key feature of a robust API is its error-handling approach.
// When building RESTful APIs using Express, or any other framework or library, validation checks are always necessary as a best practice.
//And it's always important to return an error response to the client, so that the client can stay informed on why their request isn't working.

// However, as the API grows in size and complexity, handling every possible error and returning a response for every validation check can become tedious.
// That approach can make it difficult to quickly grasp what the code is doing.
// However, having a centralized error-handling approach can simplify the code.

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// MIDDLEWARE VALIDATORS

// In previous examples, the route handler is a little complicated.
// It returns a response to the client and it's also doing some validation checks (returning a 400 status code if the result variable is falsy).
// That means that it violates the single-responsibility principle.

// To ensure that each route handler has a single responsibility, you can move all validation code into middleware functions.
// By doing all of the validation in the middleware layer, the route handler will never have to directly make any check related to the request.
// All these checks will be done in the middleware.

// New middleware function to validate the request body:

// function bodyHasTextProperty(req, res, next) {
//   const { data: { text } = {} } = req.body;
//   if (text) {
//     return next(); // Call `next()` without an error message if the result exists
//   }
//   next("A 'text' property is required.");
// }

// However, with the above code, the error message is returned, but the status code is '200'.
// This is because the status code is '200' by default.
// You need to tell the error handler the specific status code to return.
// Here, because the request is malformed, it is appropriate to return a '400' status code.

// To do this, you need to change the validation middleware and the error handler.
// The validation middleware below calls 'next()' with an object that has two properties: 'status' and 'message'.

function bodyHasTextProperty(req, res, next) {
  const { data: { text } = {} } = req.body;
  if (text) {
    return next(); // Call `next()` without an error message if the result exists
  }
  next({
    status: 400,
    message: "A 'text' property is required.",
  });
};

// The error handler needs to be edited to accept that object as an argument and make use of its properties.
// See the 'Error handlers' section below for changes.

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Routes

// Your new error handler (see below) can accept 'status' and 'message' properties.
// So, you can update any existing 'next()' calls in your routes to include helpful information (see line 76).

app.use("/pastes/:pasteId", (req, res, next) => {
  const { pasteId } = req.params;
  const foundPaste = pastes.find((paste) => paste.id === Number(pasteId));

  if (foundPaste) {
    res.json({ data: foundPaste });
  } else {
    next({ status: 404, message: `Paste id not found: ${pasteId}` });
  }
});

app.get("/pastes", (req, res) => {
  res.json({ data: pastes });
});

let lastPasteId = pastes.reduce((maxId, paste) => Math.max(maxId, paste.id), 0);

// POST request handler for '/pastes' calls 'bodyHasTextProperty()' validator middleware instead of containing that code
// Also, 'next' is no longer needed as a parameter because

app.post("/pastes", bodyHasTextProperty, (req, res, next) => {
  const { data: { name, syntax, exposure, expiration, text, user_id } = {} } = req.body;
  const newPaste = {
    id: ++lastPasteId,
    name,
    syntax,
    exposure,
    expiration,
    text,
    user_id,
  };
  pastes.push(newPaste);
  res.status(201).json({ data: newPaste });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Error handlers

// Not found handler
app.use((req, res, next) => {
  next(`Not found: ${req.originalUrl}`);
});

// General error handler

// app.use((error, req, res, next) => {
//   console.error(error);
//   res.send(error);
// });

// The error handler above will catch every error, but it doesn't respond with JSON data like the route handlers.
// That makes error handling more difficult for developers using the API.

// The error handler below makes use of potential object passes in from the validation middleware.
// If the object has 'status' and/or 'message' properties, it will make use of them in the response.
// If those properties are not supplied as arguments, those properties will deafault to '500' (Internal Server Error) and 'Somehting went wrong!'.

// With these changes, the handler can now correctly report both custom validation error AND any JavaScript 'Error'.

app.use((error, req, res, next) => {
  console.error(error);
  const { status = 500, message = "Something went wrong!" } = error;
  res.status(status).json({ error: message });
});

module.exports = app;
