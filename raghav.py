# linear_regression.py

import numpy as np
from sklearn.linear_model import LinearRegression


# Generate some random data
X = np.random.rand(100, 1)  # Features (1 column)
y = 3 * X + 2 + np.random.randn(100, 1)  # Target variable (1 column)

# Create and train the model
model = LinearRegression()
model.fit(X, y.ravel()) # Added .ravel() to fix the error

# Print the coefficients
print("Intercept:", model.intercept_)
print("Slope:", model.coef_)

# Use the model to make a prediction
X_new = np.array([[0.5]])  # New feature value
y_pred = model.predict(X_new)
print("Prediction for X = 0.5:", y_pred)

