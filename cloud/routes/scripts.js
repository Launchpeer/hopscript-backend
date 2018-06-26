const { fetchUser } = require('../main');

// This function is used to trigger an update to the Script //
// This is handy when you update a pointer and want the Script live query to know to update itself //

function _incrementScriptUpdate(scriptId) {
  return new Promise((resolve) => {
    const Script = Parse.Object.extend('Script');
    const query = new Parse.Query(Script);
    query.get(scriptId)
      .then((script) => {
        script.increment('updates');
        resolve(script.save());
      })
      .catch((err) => {
        console.log('increment scriptupdate', err);
      });
  });
}

function _createNewQuestion(data) {
  return new Promise((resolve) => {
    const Question = Parse.Object.extend('Question');
    const question = new Question();
    Object.keys(data).forEach((key) => {
      question.set(key, data[key]);
    });
    resolve(question.save());
  });
}

function _reconcileQuestionToScript(question, scriptId) {
  return new Promise((resolve) => {
    const Script = Parse.Object.extend('Script');
    const query = new Parse.Query(Script);
    query.get(scriptId)
      .then((script) => {
        script.add('questions', question);
        resolve(script.save());
      });
  });
}

function _fetchQuestion(questionId) {
  return new Promise((resolve) => {
    const Question = Parse.Object.extend('Question');
    const query = new Parse.Query(Question);
    resolve(query.get(questionId));
  });
}

/**
 A Parse Answer Object is instantiated, body and route are set, and the answer is returned
 * @param  {string} body the answer text
 * @param  {string} route the Parse objectId of the next Question to route to upon selecting this answer
 */

function _createNewAnswer({ answer, route }) {
  return new Promise((resolve) => {
    console.log('_createNewAnswer', answer, route);
    const Answer = Parse.Object.extend('Answer');
    const newAnswer = new Answer();
    newAnswer.set('body', answer);
    if (route) {
      console.log('a route');
      _fetchQuestion(route)
        .then((question) => {
          newAnswer.set('route', question);
          resolve(newAnswer.save());
        })
        .catch((err) => {
          console.log('_fetchQuestion err', err);
        });
    } else {
      console.log('no route');
      resolve(newAnswer.save());
    }
  });
}

/**
 * a Parse Query is created for the Question class, querying using the Question's objectId
 * the Question object is returned
 * the Answer object is added to the Question's array of answers as a Pointer object
 * the question is then returned
 * @param  {object} answer the Parse Answer object
 * @param  {string} questionId the Parse objectId of the Question
 */

function addAnswertoQuestion(answer, questionId) {
  return new Promise((resolve) => {
    const Question = Parse.Object.extend('Question');
    const query = new Parse.Query(Question);
    query.get(questionId)
      .then((question) => {
        console.log('question', question);
        question.add('answers', answer);
        resolve(question.save());
      });
  });
}

function _fetchScript(scriptId) {
  return new Promise((resolve) => {
    const Script = Parse.Object.extend('Script');
    const query = new Parse.Query(Script);
    query.include('questions');
    query.include('questions.answers');
    resolve(query.get(scriptId));
  });
}

Parse.Cloud.define('fetchScript', (req, res) => {
  _fetchScript(req.params.scriptId)
    .then((script) => {
      res.success(script);
    })
    .catch((err) => {
      res.error(err);
    });
});

function _reconcileScriptToUser(script, userId) {
  return new Promise((resolve) => {
    const query = new Parse.Query(Parse.User);
    query.get(userId, { useMasterKey: true })
      .then((user) => {
        user.add('scripts', script);
        resolve(user.save(null, { useMasterKey: true }));
      });
  });
}

function _createNewScript(user) {
  return new Promise((resolve) => {
    const Script = Parse.Object.extend('Script');
    const script = new Script();
    script.set('agent', user);
    resolve(script.save());
  });
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
  _createNewScript(req.user)
    .then((script) => {
      _reconcileScriptToUser(script, req.params.userId)
        .then(() => {
          res.success(script);
        })
        .catch((err) => {
          res.error(err);
        });
    })
    .catch((err) => {
      res.error(err);
    });
});

/**
 * As an agent, I want to create a new Question
 A Parse Question Object is instantiated, then that Question Object is added to the Script as a Pointer
 * @param  {object} question contains a body, a category, and an audio file
 * @param  {string} scriptId Parse objectId for the Script
 */

Parse.Cloud.define('createNewQuestion', (req, res) => {
  _createNewQuestion(req.params.question)
    .then((question) => {
      _reconcileQuestionToScript(question, req.params.scriptId)
        .then(() => {
          res.success(question);
        })
        .catch((err) => {
          res.error(err);
        });
    });
});


Parse.Cloud.define('updateScript', (req, res) => {
  const Script = Parse.Object.extend('Script');
  const query = new Parse.Query(Script);
  query.get(req.params.scriptId, { useMasterKey: true })
    .then((script) => {
      script.set('name', req.params.data.name);
      script.save()
        .then((updatedScript) => {
          res.success(updatedScript);
        })
        .catch((err) => {
          res.error(err);
        });
    })
    .catch((err) => {
      res.error(err);
    });
});

Parse.Cloud.define('createQuestion', (req, res) => {
  const Question = Parse.Object.extend('Question');
  const question = new Question();
  Object.keys(req.params.question).forEach((key) => {
    question.set(key, req.params.question[key]);
  });
  question.save()
    .then(() => {
      _fetchScript(req.params.scriptId)
        .then((script) => {
          res.success(script);
        });
    });
});

/**
 * As an agent, I want to update a Question
 * the question is fetched using the objectId
 * @param  {object} answer contains a body, and a route
 * @param  {string} questionId Parse objectId for the Question
 */

Parse.Cloud.define('updateQuestion', (req, res) => {
  _fetchQuestion(req.params.questionId)
    .then((question) => {
      Object.keys(req.params.question).forEach((key) => {
        question.set(key, req.params.question[key]);
      });
      question.save()
        .then(() => {
          _incrementScriptUpdate(req.params.scriptId)
            .then(() => {
              res.success('got em');
            })
            .catch((err) => {
              console.log('increment err', err);
              res.error(err);
            });
        });
    })
    .catch((err) => {
      console.log('fetch question err', err);
      res.error(err);
    });
});

/**
 * As an agent, I want to add an Answer to my Script Question
 A Parse Answer Object is instantiated, then that Answer Object is added to the Question as a Pointer
 * @param  {object} answer contains a body, and a route
 * @param  {string} questionId Parse objectId for the Question
 */

function _createAndReconcileAnswer(answer, questionId) {
  return new Promise((resolve) => {
    _createNewAnswer(answer)
      .then((parseAnswer) => {
        addAnswertoQuestion(parseAnswer, questionId)
          .then((question) => {
            resolve(question);
          })
          .catch((err) => {
            console.log('reconcileAnswerToQuestion', err);
          });
      })
      .catch((err) => {
        console.log('createNewAnswer err', err);
      });
  });
}
Parse.Cloud.define('createNewAnswer', (req, res) => {
  _createAndReconcileAnswer(req.params.data, req.params.questionId)
    .then((question) => {
      _fetchScript(req.params.scriptId)
        .then((script) => {
          res.success(script);
        });
    })
    .catch((err) => {
      res.error(err);
    });
});

function _saveAnswerAndFetchScript(answer, scriptId) {
  return new Promise((resolve) => {
    answer.save()
      .then((answer) => {
        resolve(_fetchScript(scriptId));
      });
  });
}

function _updateAnswer(answer, data, scriptId) {
  return new Promise((resolve) => {
    answer.set('body', data.answer);
    if (data.route) {
      _fetchQuestion(data.route)
        .then((question) => {
          answer.set('route', question);
          resolve(_saveAnswerAndFetchScript(answer, scriptId));
        });
    } else {
      resolve(_saveAnswerAndFetchScript(answer, scriptId));
    }
  });
}

Parse.Cloud.define('updateAnswer', (req, res) => {
  _fetchAnswer(req.params.answerId)
    .then((answer) => {
      _updateAnswer(answer, req.params.answer, req.params.scriptId)
        .then((script) => {
          res.success(script);
        });
    })
    .catch((err) => {
      console.log('get answer err', err);
    });
});

function _formatAnswerData(data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  return keys.map((k) => {
    if (k.startsWith('answer')) {
      return {
        body: values[keys.indexOf(k)],
        route: values[keys.indexOf(k) + 1]
      };
    }
  }).filter((j) => { if (j) { return j; } });
}


/**
 * As an agent, I want to add an Answer to my Script Questions
 * We format the object data by matching the answer and route
 * This data becomes an array of objects
 * We map over this object array and create a new array of promises
 * We then wait for all of the promises to resolve before triggering an update to the Script
 * The web portal is listening for updates to the Script and will trigger a fetch on it's side
 * @param  {object} data contains routes and answers
 * @param  {string} questionId Parse objectId for the Question
 * @param  {string} scriptId Parse objectId for the Script
*/


Parse.Cloud.define('addAnswers', (req, res) => {
  Promise.all(_formatAnswerData(req.params.data)
    .map(answer => _createAndReconcileAnswer(answer, req.params.questionId)))
    .then(() => {
      _fetchScript(req.params.scriptId)
        .then((script) => {
          res.success(script);
        })
        .catch((err) => {
          res.error(err);
        });
    })
    .catch(err => res.error(err));
});

function _fetchAnswer(answerId) {
  return new Promise((resolve) => {
    const Answer = Parse.Object.extend('Answer');
    const query = new Parse.Query(Answer);
    resolve(query.get(answerId));
  });
}

function _deleteAnswer(answer) {
  return new Promise((resolve) => {
    resolve(answer.destroy({ useMasterKey: true }));
  });
}

function _dissociateAnswerFromQuestion(answer, questionId) {
  return new Promise((resolve) => {
    _fetchQuestion(questionId)
      .then((question) => {
        question.remove("answers", answer);
        resolve(question.save());
      });
  });
}

function _deleteAndDissociateAnswer(answerId, scriptId, questionId) {
  return new Promise((resolve) => {
    _fetchAnswer(answerId)
      .then((answer) => {
        Promise.all([
          _deleteAnswer(answer),
          _dissociateAnswerFromQuestion(answer, questionId)
        ])
          .then(() => {
            resolve(_fetchScript(scriptId));
          });
      });
  });
}

Parse.Cloud.define('deleteAnswer', (req, res) => {
  _deleteAndDissociateAnswer(req.params.answerId, req.params.scriptId, req.params.questionId)
    .then((script) => {
      res.success(script);
    })
    .catch((err) => {
      res.error('_dissociateAnswerFromQuestion ERR:', err);
    });
});


// fetches all scripts associated with the user querying
const fetchScripts = user => new Promise((resolve) => {
  const scriptsQuery = new Parse.Query("Script");
  scriptsQuery.equalTo('agent', user);
  resolve(scriptsQuery.find(null, { userMasterKey: true }));
});

Parse.Cloud.define('fetchScripts', (req, res) => {
  fetchScripts(req.user)
    .then(scripts => res.success(scripts))
    .catch((err) => {
      res.error(err);
    });
});

function _deleteQuestion(question) {
  return new Promise((resolve) => {
    resolve(question.destroy({ useMasterKey: true }));
  });
}

Parse.Cloud.define('deleteQuestion', (req, res) => {
  _fetchQuestion(req.params.question)
    .then((q) => {
      Promise.all(q.attributes.answers.map(answer => _deleteAnswer(answer)))
        .then(() => {
          _deleteQuestion(q)
            .then(() => {
              _fetchScript(req.params.script)
                .then(script => res.success(script))
                .catch(fetchScriptErr => res.error('fetchScriptErr:', fetchScriptErr));
            }).catch(deleteQErr => res.error('deleteQErr:', deleteQErr));
        }).catch(deleteAErr => res.error('deleteAErr:', deleteAErr));
    }).catch(fetchQErr => res.error('fetchQErr:', fetchQErr));
});

function _dissociateScriptFromUser(script, userId) {
 return new Promise((resolve) => {
   fetchUser(userId)
     .then((user) => {
       user.remove("scripts", script);
       resolve(user.save(null, { useMasterKey: true }));
     })
     .catch((err) => {
       console.log('FETCH USER ERR: ', err);
     })
 });
}

function _deleteScript(script) {
 return new Promise((resolve) => {
   resolve(script.destroy({ useMasterKey: true }));
 });
}

function _deleteScriptAndUpdate(script, user) {
 return new Promise((resolve) => {
   _deleteScript(script)
     .then(() => {
       resolve(fetchScripts(user));
     })
 })
}

function _fetchAndDeleteQuestion(id) {
  return new Promise((resolve) => {
    _fetchQuestion(id)
      .then((question) => {
        resolve(_deleteQuestion(question));
      })
      .catch((fetchQuestionErr) => {
        console.log('FETCH QUESTION ERR: ', fetchQuestionErr);
      })
  })
}

// fetch question
// delete answers
// delete question
//

function _deleteAnswersAndDeleteQuestion(question) {
  return new Promise((resolve) => {
    if(question.attributes.answers) {
      Promise.all(question.attributes.answers.map(answer => _deleteAnswer(answer)))
        .then(() => {
          resolve(_deleteQuestion(question));
        })
        .catch((deleteAnswerErr) => {
          console.log('DELETE ANSWER ERR', deleteAnswerErr);
        })
    } else {
      resolve(_deleteQuestion(question));
    }
  })
}

Parse.Cloud.define('deleteScript', (req, res) => {
 _fetchScript(req.params.id)
   .then((script) => {
     _dissociateScriptFromUser(script, req.user.id)
       .then(() => {
         if(script.attributes.questions) {
           Promise.all(script.attributes.questions.map((question) =>
           _deleteAnswersAndDeleteQuestion(question)))
             .then(() => {
               _deleteScriptAndUpdate(script, req.user)
                 .then((scripts) => {
                   res.success(scripts)
                 })
                 .catch((deleteScriptErr) => {
                   res.error('DELETE SCRIPT ERR: ', deleteScriptErr)
                 })
             })
             .catch((deleteQuestionErr) => {
               res.error('DELETE QUESTION ERR: ', deleteQuestionErr)
             })
         } else {
           _deleteScriptAndUpdate(script, req.user)
             .then((scripts) => {
               res.success(scripts)
             })
             .catch((deleteScriptErr) => {
               res.error('DELETE SCRIPT ERR: ', deleteScriptErr)
             })
         }
       })
       .catch((dissociateScriptFromUserErr) => {
         res.error('DISSOCIATE SCRIPT FROM USER ERR: ', dissociateScriptFromUserErr)
       })
   })
})
