describe("Fonctionnalité - connexion utilisateur", () => {
  let testData;

  before(() => {
    cy.fixture("test-data").then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit("/#/login");
  });

  it("affiche une erreur avec des identifiants incorrects", () => {
    cy.intercept(
      "POST",
      `${Cypress.env("apiUrl")}/login`
    ).as("invalidLogin");

    cy.get('[data-cy="login-input-username"]')
      .type(testData.invalidUser.username);

    cy.get('[data-cy="login-input-password"]')
      .type(testData.invalidUser.password);

    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@invalidLogin")
      .its("response.statusCode")
      .should("eq", 403);

    cy.get('[data-cy="login-errors"]')
      .should("be.visible")
      .and("contain", "Identifiants incorrects");

    cy.location("hash").should("eq", "#/login");

    cy.window().then((window) => {
      const hasStoredUser =
        window.localStorage.getItem("user") !== null;

      expect(hasStoredUser).to.eq(false);
    });
  });

  it("connecte et redirige un utilisateur valide", () => {
    cy.intercept(
      "POST",
      `${Cypress.env("apiUrl")}/login`
    ).as("validLogin");

    cy.get('[data-cy="login-input-username"]')
      .type(testData.validUser.username);

    cy.get('[data-cy="login-input-password"]')
      .type(testData.validUser.password);

    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@validLogin")
      .its("response.statusCode")
      .should("eq", 200);

    cy.url().should("not.include", "/login");

    cy.window().then((window) => {
      const token = window.localStorage.getItem("user");

      const hasValidStoredToken =
        typeof token === "string" &&
        token.length > 0 &&
        token.split(".").length === 3;

      expect(hasValidStoredToken).to.eq(true);
    });

    cy.contains("Mon panier").should("be.visible");
    cy.contains("Déconnexion").should("be.visible");
  });
});