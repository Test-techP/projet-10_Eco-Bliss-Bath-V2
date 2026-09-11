describe("API - POST /login", () => {
  let testData;

  before(() => {
    return cy.fixture("test-data").then((data) => {
      testData = data;
    });
  });

  it("refuse la connexion avec des identifiants invalides", () => {
    cy.request({
      method: "POST",
      url: `${Cypress.env("apiUrl")}/login`,
      failOnStatusCode: false,
      body: testData.invalidUser,
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body.code).to.eq(401);
      expect(response.body.message).to.eq(
        "Invalid credentials."
      );
    });
  });

  it("connecte un utilisateur avec des identifiants valides", () => {
    cy.loginByApi(testData.validUser).then((token) => {
      expect(token.split(".")).to.have.length(3);
    });
  });
});