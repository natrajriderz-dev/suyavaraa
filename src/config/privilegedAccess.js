const OWNER_UID = '31080697-96d9-4d5f-9884-a8eef2acd4ad';

function isOwnerUser(userId) {
  return Boolean(userId) && userId === OWNER_UID;
}

module.exports = {
  OWNER_UID,
  isOwnerUser,
};
