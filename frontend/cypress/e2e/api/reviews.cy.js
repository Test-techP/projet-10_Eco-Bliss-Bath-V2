
describe("API - POST /reviews", () => {
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

  it("crée un avis avec des données valides", () => {
    const review = {
      ...testData.review,
      title: `${testData.review.title} ${Date.now()}`,
    };

    cy.request({
      method: "POST",
      url: `${Cypress.env("apiUrl")}/reviews`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: review,
    }).then((response) => {
      expect(response.status).to.eq(200);

      expect(response.body.id).to.be.a("number");
      expect(response.body.title).to.eq(review.title);
      expect(response.body.comment).to.eq(review.comment);
      expect(response.body.rating).to.eq(review.rating);
      expect(response.body.date).to.be.a("string");

      expect(response.body.author).to.be.an("object");
      expect(response.body.author.email).to.eq(
        testData.validUser.username
      );
    });
  });
});