process.env.NODE_ENV = 'test';
const knex = require('../knex');
const chai = require('chai');
require('dotenv').config();
const assert = chai.assert;
const jwt = require('jwt-simple');
const {
  getProjectsFromDatabase,
  sendProjectToDatabase,
  getProjectById,
  getIndexOfProject,
  setupNewGrid,
  addNewProject,
  sendFinishedProjectToDatabase,
  deleteUnfinishedProject,
  galleryArt,
  changePixel,
  getIdFromToken,
  getUserProjectsArray,
  checkForUser,
  addUserPermission,
  getNameFromToken
} = require('../utilities');

const fiveBy = [["#FFF","#FFF","#FFF","#FFF","#FFF"], ["#FFF","#FFF","#FFF","#FFF","#FFF"],
["#FFF","#FFF","#FFF","#FFF","#FFF"],
["#FFF","#FFF","#FFF","#FFF","#FFF"],
["#FFF","#FFF","#FFF","#FFF","#FFF"]];

const testUser = { email: 'bob@foo.com', username: 'Bob', user_id: 7, isMod: false };
const timestamp = new Date().getTime();
testToken = jwt.encode({ sub: testUser.user_id, iat: timestamp }, process.env.JWT_KEY);

describe('setUpNewGrid', function(){
  it('should return an empty array if x or y are less than 1', function(){
    assert.deepEqual(setupNewGrid(0, 10), []);
    assert.deepEqual(setupNewGrid(10, 0), []);
    assert.notDeepEqual(setupNewGrid(10, 10), []);
  });

  it('should return a proper 5x5 array if 5 and 5 are passed in', function() {
    assert.deepEqual(setupNewGrid(5, 5), fiveBy);
  });
});

describe('database tests', function(){
  beforeEach(async function() {
    await knex.migrate.rollback()
    await knex.migrate.latest()
    await knex.seed.run()
  });

  afterEach(() => knex.migrate.rollback());

  describe('getProjectsFromDatabase', function(){
    it('should return an array of all open projects in the database', function(){
      return getProjectsFromDatabase().then((projects) =>{
        assert.equal(projects.length, 1);
      });
    });
  });

  describe('getProjectById function test', function(){
    it('should return the proper project when called', function(){
      return getProjectsFromDatabase().then((projects) =>{
        assert.equal(getProjectById(projects, 1).project_id, 1);
      });
    });
  });

  describe('getIndexOfProject function test', function(){
    it('should return the proper index when called', function(){
      return getProjectsFromDatabase().then((projects) =>{
        assert.equal(getIndexOfProject(projects, 1), 0);
      });
    })
  });

  describe('addNewProject test', function (){
    it('should properly add a new project to the database', async function(){
      var results = await getProjectsFromDatabase();
      assert.equal(results.length, 1);
      let probject = { name: 'foo', x: 20, y: 20, token: testToken };
      await addNewProject(results, probject);
      assert.equal(results.length, 2);
    });
    it('should properly add an entry to the users_projects table', async function(){
      //token for jhl user in database id: 1
      let token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImlhdCI6MTUxNjEzNjMxNTc2NX0.ULJrMww3VFATt7cs5aD1gyNz6WZhadMWSjuTP692Z1g';
      let probject = { name: 'foo', x: 20, y: 20, token: token };
      let projects = await getProjectsFromDatabase();
      await addNewProject(projects, probject);
      let userArray = await getUserProjectsArray(projects, token);
      assert.equal(userArray.length, 2);
    });
  });

  describe('Gallery Art test', function(){
    it('should properly retrieve finished art work from the database', function(){
      return galleryArt().then((projects) => {
        assert.equal(projects.length, 1);
      });
    });
  });

  describe('sendFinishedProjectToDatabase', function(){
    it('should remove a project from the current projects and add it to the finished art gallery.', async function(){
      let projects = await getProjectsFromDatabase();
      await sendFinishedProjectToDatabase(projects, 1);
      let gallery = await galleryArt();
      projects2 = await getProjectsFromDatabase();
      assert.equal(gallery.length, 2);
      assert.equal(projects2.length, 0);
    });
  });

  describe('deleteUnfinishedProject', function(){
    it('should remove an open from the database', async function(){
      await deleteUnfinishedProject(1);
      let projects = await getProjectsFromDatabase();
      assert.equal(projects.length, 0)
    });
  });

  describe('sendProjectToDatabase', function(){
    it('should save the current state of a project to a database', async function(){
      let pixel = { x: 0, y: 0, color: '#000', project: 1 };
      let projects = await getProjectsFromDatabase();
      let testProject1 = await getProjectById(projects, 1);
      changePixel(projects, pixel);
      await sendProjectToDatabase(projects, 1);
      let endProjects = await getProjectsFromDatabase();
      let testProject2 = await getProjectById(endProjects, 1);
      assert.notEqual(testProject1.grid, testProject2.grid);
    });
  });

  describe('Change Pixel', function(){
    it('should properly change a pixel in a project', async function(){
      let pixel = { x: 0, y: 0, color: '#000', project: 1 };
      let projects = await getProjectsFromDatabase();
      let grid1 = [];
      Object.assign(grid1, projects[0].grid);
      changePixel(projects, pixel);
      let grid2 = [];
      Object.assign(grid2, projects[0].grid);
      assert.notEqual(grid1, grid2);
    });
  });

  describe('Get User Projects', function(){
    it('should properly retrieve a list of active projects belonging to a user', async function(){
      //token for jhl user in database id: 1
      let token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImlhdCI6MTUxNjEzNjMxNTc2NX0.ULJrMww3VFATt7cs5aD1gyNz6WZhadMWSjuTP692Z1g';
      let projects = await getProjectsFromDatabase();
      let userArray = await getUserProjectsArray(projects, token);
      assert.equal(userArray.length, 1);
    });
  });

  describe('Check For User', function(){
    it('should return a user id if the user exists in the database', async function(){
      let usernameTest = await checkForUser("jhl", null);
      let emailTest = await checkForUser(null, "jon@lindell.com");
      let nullTest = await checkForUser("foo", "bar");
      assert.equal(usernameTest, 1);
      assert.equal(emailTest, 1);
      assert.equal(nullTest, null);
    });
  });

  describe('Add User Permission', function(){
    it('should properly add a user permission in the users_projects database', async function(){
      let davesToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiZGF2ZSIsInN1YiI6MiwiaWF0IjoxNTE2Mzg4NjQ3NTY3fQ.Bru4csmkCbKQZEsrXhZkEaeGpCVsEWrcuHgvMZkJg_I'
      let goodTest = await addUserPermission(2, 1);
      let projects = await getProjectsFromDatabase();
      let userArray = await getUserProjectsArray(projects, davesToken);
      assert.equal(userArray.length, 1);
      let badTest = await addUserPermission(7, 12);
      assert.equal(goodTest, true);
      assert.equal(badTest, false);
    });
  });

});

describe('auth tests', function(){
  it('should properly grab the user_id off a token', function(){
    tokenId = getIdFromToken(testToken);
    assert.equal(tokenId, 7);
  });
});
