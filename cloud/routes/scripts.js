

function _createNewQuestion({ body, category, audioURI }) {
  const questionClass = Parse.Object.extend('Question');
  const Question = new questionClass;
  if(body) { Question.set('body', body); }
  if(category) { Question.set('category', category); }
  if (audio) {
    Question.set('audioURI', audio);
  }
  resolve(Question.save());
}

function _reconcileQuestionToScript(question, scriptId) {
  return new Promise((resolve) => {
    const Script = Parse.Object.extend('Script');
    const query = new Parse.Query(Script);
    query.get(scriptId)
      .then((script) => {
        script.add('question', question);
        resolve(script.save());
      })
  })
}

function _fetchQuestion(questionId) {
  return new Promise((resolve) => {
    const Question = Parse.Object.extend('Question');
    const query = new Parse.Query(Question);
    resolve(query.get(questionId));
  })
}

/**
 A Parse Answer Object is instantiated, body and route are set, and the answer is returned

 * @param  {string} body the answer text
 * @param  {string} route the Parse objectId of the next Question to route to upon selecting this answer
 */

function _createNewAnswer({ body, route }) {
  const answerClass = Parse.Object.extend('Answer');
  const Answer = new answerClass;
  if (body) { Answer.set('body', body); }
  if (route) { Answer.set('route', route); }
  resolve(Answer.save());
}

/**
 * a Parse Query is created for the Question class, querying using the Question's objectId
 * the Question object is returned
 * the Answer object is added to the Question's array of answers as a Pointer object
 * the question is then returned
 * @param  {object} answer the Parse Answer object
 * @param  {string} questionId the Parse objectId of the Question
 */

function _reconcileAnswertoQuestion(question, questionId) {
  return new Promise((resolve) => {
    const Question = Parse.Object.extend('Question');
    const query = new Parse.Query(Question);
    query.get(questionId)
      .then((question) => {
        question.add('answers', answer);
        resolve(question.save());
      })
  })
}

Parse.Cloud.define('fetchScript', (req, res) => {
  const Script = Parse.Object.extend('Script');
  const query = new Parse.Query(Script);
  query.include('questions');
  query.include('questions.answers');
  query.get(req.params.scriptId)
    .then(script => {
      res.success(script);
    })
    .catch(err => {
      res.error(err);
    })

})

function _reconcileScriptToUser(script, userId) {
  return new Promise((resolve) => {
    const query = new Parse.Query(Parse.User);
    query.get(userId, { useMasterKey: true })
      .then((user) => {
        user.add('scripts', script);
        resolve(user.save());
      })
  })
}

/**
 * As an agent, I want to create a new Script
 *
 * A Parse Script Object is instantiated
 * then that Script Object is added to the User as a Pointer in their scripts array
 *
 * @param  {string} userId Parse objectId for the User
 */


Parse.Cloud.define('createNewScript', (req, res) => {
  _createNewScript()
    .then(script => {
      _reconcileScriptToUser(script, req.params.userId)
        .then((user) => {
          res.success(user);
        })
        .catch((err) => {
          res.error(err);
        })
    })
    .catch(err => {
      res.error(err);
    })
})

/**
 * As an agent, I want to create a new Question

 A Parse Question Object is instantiated, then that Question Object is added to the Script as a Pointer

 * @param  {object} question contains a body, a category, and an audio file
 * @param  {string} scriptId Parse objectId for the Script
 */

Parse.Cloud.define('createNewQuestion', (req, res) => {
  _createNewQuestion(req.params.question)
    .then(question => {
      _reconcileQuestionToScript(question, req.params.scriptId)
        .then(script => {
          res.success(script);
        })
        .catch(err => {
          res.error(err);
        })
    })
})

/**
 * As an agent, I want to add an Answer to my Script Question

 A Parse Answer Object is instantiated, then that Answer Object is added to the Question as a Pointer

 * @param  {object} answer contains a body, and a route
 * @param  {string} questionId Parse objectId for the Question
 */

Parse.Cloud.define('createNewAnswer', (req, res) => {
  _createNewAnswer(req.answer)
    .then(answer => {
      _reconcileAnswerToQuestion(answer, req.questionId)
        .then(question => {
          res.success(question);
        })
        .catch(err => {
          res.error(err);
        })
    })
})

Parse.Cloud.define('updateScript', (req, res) => {
  const Script = Parse.Object.extend('Script');
  const query = new Parse.Query(Script);
  query.get(req.scriptId)
    .then(script => {
      script.set('name', req.data.name);
      script.save()
        .then(updatedScript => {
          res.success(updatedScript);
        })
        .catch(err => {
          res.error(err);
        })
    })
    .catch(err => {
      res.error(err)
    })
})
