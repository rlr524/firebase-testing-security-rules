const assert = require("assert");
const firebase = require("@firebase/testing");

const MY_PROJECT_ID = "emiya-testing-security-rules";
const myUserRecord = {
  uid: "user_abc",
  email: "abc@gmail.com"
};
const theirUserRecord = {
  uid: "user_xyz",
  email: "xyz@gmail.com"
};

function getFirestore(auth) {
  return firebase
    .initializeTestApp({ projectId: MY_PROJECT_ID, auth: auth })
    .firestore();
}

describe("Our firebase app", () => {
  it("Understands basic addition", () => {
    assert.equal(2 + 2, 4);
  });

  it("Can read items in our read-only collection", async () => {
    const db = getFirestore(null);
    const testDoc = db.collection("readonly").doc("testDoc");
    await firebase.assertSucceeds(testDoc.get());
  });

  it("Can't write to items in our read-only collection", async () => {
    const db = getFirestore(null);
    const testDoc = db.collection("readonly").doc("testDoc");
    await firebase.assertFails(testDoc.set({ name: "Madison" }));
  });

  it("Can write to a user doc with the same ID as the user", async () => {
    const db = getFirestore(myUserRecord);
    const testDoc = db.collection("users").doc(myUserRecord.uid);
    await firebase.assertSucceeds(testDoc.set({ say: "Hello" }));
  });

  it("Cannot write to a user doc with a different ID as the user", async () => {
    const db = getFirestore(myUserRecord);
    const testDoc = db.collection("users").doc(theirUserRecord.uid);
    await firebase.assertFails(testDoc.set({ say: "Hello" }));
  });

  // security rule has to prove in this case that the access would be allowed no matter what is in the underlying data
  // the rule can't look at every document, it would negatively impact db performance
  // if we're querying for only public docs here, by definition response.data.visibility will always be
  // public unless otherwise stated, including in the absence of any documents as here
  it("Can read posts marked public", async () => {
    const db = getFirestore(null);
    const testQuery = db
      .collection("posts")
      .where("visibility", "==", "public");
    await firebase.assertSucceeds(testQuery.get());
  });

  it("Can query personal posts", async () => {
    const db = getFirestore(myUserRecord);
    const testQuery = db
      .collection("posts")
      .where("authorId", "==", myUserRecord.uid);
    await firebase.assertSucceeds(testQuery.get());
  });

  // note this is the *other* user signed in trying to view *my* non-public posts
  it("Can't query non-public posts by other users", async () => {
    const db = getFirestore(theirUserRecord);
    const testQuery = db
      .collection("posts")
      .where("authorId", "==", myUserRecord.uid);
    await firebase.assertFails(testQuery.get());
  });

  // Here, some docs *may* be marked as private so the test has to fail because I am trying to query *all* docs
  // in this case it would fail with assertSucceeds with the error that property visibility is undefined in the object (because there is no object)
  it("Can't query all posts", async () => {
    const db = getFirestore(myUserRecord);
    const testQuery = db.collection("posts");
    await firebase.assertFails(testQuery.get());
  });
});

// clear all the firestore data (using local emulator) after tests
after(async () => {
  await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
});
