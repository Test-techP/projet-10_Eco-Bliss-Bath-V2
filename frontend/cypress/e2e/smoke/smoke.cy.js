describe("Smoke tests", () => {
  let testData;

  before(() => {
    cy.fixture("test-data").then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it("affiche les champs et le bouton de connexion", () => {
    cy.visit("/#/login");

    cy.get('[data-cy="login-form"]')
      .should("be.visible");

    cy.get('[data-cy="login-input-username"]')
      .should("be.visible")
      .and("not.be.disabled");

    cy.get('[data-cy="login-input-password"]')
      .should("be.visible")
      .and("not.be.disabled");

    cy.get('[data-cy="login-submit"]')
      .should("be.visible")
      .and("not.be.disabled")
      .and("contain", "Se connecter");
  });

  it("affiche le bouton d'ajout au panier pour un utilisateur connecté", () => {
    const product = testData.products.available;

    cy.loginByApi(testData.validUser).then((token) => {
      cy.visit(`/#/products/${product.id}`, {
        onBeforeLoad(window) {
          window.localStorage.setItem("user", token);
        },
      });
    });

    // Confirme que l’interface reconnaît l’utilisateur connecté.
    cy.get('[data-cy="nav-link-cart"]')
      .should("be.visible");

    cy.get('[data-cy="nav-link-login"]')
      .should("not.exist");

    cy.get('[data-cy="detail-product-name"]')
      .should("have.text", product.name);

    cy.get('[data-cy="detail-product-add"]')
      .should("be.visible")
      .and("not.be.disabled")
      .and("contain", "Ajouter au panier");
  });
});