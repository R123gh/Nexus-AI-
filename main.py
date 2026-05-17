# Import necessary libraries
import numpy as np
from sklearn.linear_model import LinearRegression


# Set a seed for reproducibility
np.random.seed(0)

# Generate random data
X = np.random.rand(100, 1)
y = 3 * X.squeeze() + 2 + np.random.randn(100) * 0.5

# Create and fit the linear model
model = LinearRegression()
model.fit(X, y)

# Print coefficients
print("Coefficient (slope): ", model.coef_)
print("Intercept: ", model.intercept_)
