describe("Sécurité - protection contre les attaques XSS", () => {
  let testData;
  let token;

  before(() => {
    cy.fixture("test-data")
      .then((data) => {
        testData = data;
        return cy.loginByApi(data.validUser);
      })
      .then((receivedToken) => {
        token = receivedToken;
      });
  });

  it("neutralise le code JavaScript injecté dans un commentaire", () => {
    const uniqueId = Date.now();
    const reviewTitle = `Test XSS Cypress ${uniqueId}`;

    const xssPayload =
      `<img src="image-inexistante-${uniqueId}" ` +
      `onerror="window.__xssExecuted=true;window.alert('XSS')">`;

    cy.intercept(
      "GET",
      `${Cypress.env("apiUrl")}/reviews`
    ).as("getReviews");

    cy.intercept(
      "POST",
      `${Cypress.env("apiUrl")}/reviews`
    ).as("postReview");

    cy.visit("/#/reviews", {
      onBeforeLoad(window) {
        window.localStorage.setItem("user", token);
        window.__xssExecuted = false;

        cy.stub(window, "alert").as("xssAlert");
      },
    });

    // Attend le chargement initial des avis.
    cy.wait("@getReviews")
      .its("response.statusCode")
      .should("eq", 200);

    cy.get('[data-cy="review-input-title"]')
      .type(reviewTitle);

    cy.get('[data-cy="review-input-comment"]')
      .type(xssPayload, {
        parseSpecialCharSequences: false,
      })
      .should("have.value", xssPayload);

    cy.get('[data-cy="review-input-rating-images"] img')
      .eq(testData.review.rating - 1)
      .click();

    cy.get('[data-cy="review-input-rating"]')
      .should(
        "have.value",
        testData.review.rating.toString()
      );

    cy.get('[data-cy="review-submit"]').click();

    cy.wait("@postReview")
      .its("response.statusCode")
      .should("eq", 200);

    // L’application recharge les avis après leur création.
    cy.wait("@getReviews")
      .its("response.statusCode")
      .should("eq", 200);

    cy.contains(
      '[data-cy="review-detail"]',
      reviewTitle
    )
      .should("be.visible")
      .find('[data-cy="review-comment"]')
      .then(($comment) => {
        const displayedHtml = $comment.html() ?? "";

        expect(
          displayedHtml,
          "le gestionnaire JavaScript doit être supprimé"
        ).not.to.contain("onerror");
      });

    cy.window().then((window) => {
      expect(
        window.__xssExecuted,
        "le code injecté ne doit pas être exécuté"
      ).to.eq(false);
    });

    cy.get("@xssAlert").should("not.have.been.called");
  });
});