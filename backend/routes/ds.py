"""
NexusAI — Data Science Route
Handles EDA, Training, and Evaluation of ML models.
"""

from flask import Blueprint, request, jsonify
from config import get_groq_key, UPLOAD_FOLDER
import pandas as pd
import numpy as np
import io
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVR, SVC
from sklearn.neighbors import KNeighborsRegressor, KNeighborsClassifier
from sklearn.neural_network import MLPRegressor, MLPClassifier
from sklearn.linear_model import SGDRegressor, SGDClassifier
from sklearn.metrics import r2_score, accuracy_score, mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
import joblib
import tempfile
import json

ds_bp = Blueprint('ds', __name__)

# Temporary storage for dataframes (in-memory for simplicity in this demo)
# In a real app, this would be session-based or saved to disk/DB
data_store = {}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@ds_bp.route('/upload', methods=['POST'])
def upload_data():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        df = pd.read_csv(file)
        session_id = request.form.get('session_id', 'default')
        data_store[session_id] = df
        
        # Persist to disk for recovery after restarts
        file_path = os.path.join(UPLOAD_FOLDER, f"data_{session_id}.csv")
        df.to_csv(file_path, index=False)
        
        categorical_cols = list(df.select_dtypes(exclude=[np.number]).columns)
        cat_details = {}
        for col in categorical_cols:
            cat_details[col] = [str(x) for x in df[col].dropna().unique()[:20]] # Limit to top 20 for UI sanity
            
        # Basic info
        info = {
            'rows': len(df),
            'cols': len(df.columns),
            'columns': list(df.columns),
            'head': df.head(5).replace({np.nan: None}).to_dict(orient='records'),
            'numeric_cols': list(df.select_dtypes(include=[np.number]).columns),
            'categorical_cols': categorical_cols,
            'cat_details': cat_details,
        }
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ds_bp.route('/run-inference', methods=['POST'])
def predict():
    data = request.json
    session_id = data.get('session_id', 'default')
    inputs = data.get('inputs', {}) # Dict of {feature_name: value}
    
    pipeline_key = f"{session_id}_pipeline"
    if pipeline_key not in data_store:
        return jsonify({'error': 'Model not found. Please train a model first.'}), 400
    
    try:
        pipeline = data_store[pipeline_key]
        feature_cols = data_store[f"{session_id}_feature_cols"]
        numeric_features = data_store.get(f"{session_id}_numeric_features", [])
        task_type = data_store[f"{session_id}_task_type"]
        
        # 1. Create a DataFrame from inputs
        input_df = pd.DataFrame([inputs])
        
        # 2. Ensure all original feature columns are present
        for col in feature_cols:
            if col not in input_df.columns:
                input_df[col] = np.nan
        
        input_df = input_df[feature_cols] # Maintain order
        
        # 3. Coerce numeric columns (they might be strings from the UI)
        for col in numeric_features:
            input_df[col] = pd.to_numeric(input_df[col], errors='coerce')
        
        # 4. Predict using the unified Pipeline
        # This automatically handles scaling and encoding for both numeric and string data
        prediction = pipeline.predict(input_df)
        
        result = {
            'prediction': float(prediction[0]) if task_type == 'regression' else int(prediction[0]),
            'task_type': task_type
        }
        
        # Confidence if available
        model = pipeline.named_steps['model']
        if hasattr(model, 'predict_proba'):
            # Preprocess the input for proba (using the preprocessor step of the pipeline)
            preprocessed_input = pipeline.named_steps['preprocessor'].transform(input_df)
            probs = model.predict_proba(preprocessed_input)
            # Ensure we get a standard float, not np.float64
            conf = np.max(probs)
            result['confidence'] = float(conf) if not (np.isnan(conf) or np.isinf(conf)) else 0.0
            
        # Decode classification label if possible
        if task_type == 'classification' and f"{session_id}_le" in data_store:
            le = data_store[f"{session_id}_le"]
            result['label'] = str(le.inverse_transform([prediction[0]])[0])
                
        return jsonify(result)
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@ds_bp.route('/eda', methods=['GET', 'POST'])
def perform_eda():
    if request.method == 'POST':
        session_id = request.json.get('session_id', 'default')
    else:
        session_id = request.args.get('session_id', 'default')
        
    if session_id not in data_store:
        file_path = os.path.join(UPLOAD_FOLDER, f"data_{session_id}.csv")
        if os.path.exists(file_path):
            try:
                data_store[session_id] = pd.read_csv(file_path)
            except:
                return jsonify({'error': 'Failed to recover session. Please re-upload.'}), 400
        else:
            return jsonify({'error': 'No data found. Please upload first.'}), 400
    
    df = data_store[session_id]
    
    try:
        summary = df.describe(include='all').replace({np.nan: None}).to_dict()
        missing = df.isnull().sum().to_dict()
        corr = None
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty:
            corr = numeric_df.corr().replace({np.nan: None}).to_dict()
            
        return jsonify({
            'summary': summary,
            'missing': missing,
            'correlation': corr,
            'dtypes': df.dtypes.astype(str).to_dict(),
            'rows_head': df.head(100).replace({np.nan: None}).to_dict(orient='records') # For Live Explorer
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ds_bp.route('/train', methods=['POST'])
def train_models():
    data = request.json
    session_id = data.get('session_id', 'default')
    target_col = data.get('target')
    feature_cols = data.get('features', [])
    task_type = data.get('task_type', 'regression') # 'regression' or 'classification'
    mode = data.get('mode', 'ml') # 'ml' or 'dl'
    tune = data.get('tune', False)
    
    if session_id not in data_store:
        # Try to recover from disk
        file_path = os.path.join(UPLOAD_FOLDER, f"data_{session_id}.csv")
        if os.path.exists(file_path):
            try:
                data_store[session_id] = pd.read_csv(file_path)
                print(f"Recovered session {session_id} from disk.")
            except Exception as e:
                print(f"Failed to recover session {session_id}: {e}")
                return jsonify({'error': 'Session lost and recovery failed. Please re-upload.'}), 400
        else:
            print(f"Error: Session {session_id} not found and no recovery file at {file_path}")
            return jsonify({'error': 'No data found. Please upload your CSV again.'}), 400
    
    df = data_store[session_id]
    
    if target_col not in df.columns:
        return jsonify({'error': f'Target column {target_col} not found.'}), 400
    
    try:
        import time
        from sklearn.metrics import confusion_matrix, roc_curve, auc
        start_total = time.time()
        
        # 1. Preprocessing Pipeline Definition
        numeric_features = df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()
        categorical_features = df[feature_cols].select_dtypes(exclude=[np.number]).columns.tolist()

        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore'))
        ])

        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_features),
                ('cat', categorical_transformer, categorical_features)
            ]
        )

        # Prepare Target
        df_work = df[feature_cols + [target_col]].dropna(subset=[target_col])
        X = df_work[feature_cols]
        y = df_work[target_col]
        
        if task_type == 'classification':
            le = LabelEncoder()
            y = le.fit_transform(y)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        results = []
        
        # Define Models (without preprocessing here, we'll add to pipeline)
        if mode == 'ml':
            if task_type == 'regression':
                base_models = {
                    'Linear Regression': LinearRegression(),
                    'Random Forest': RandomForestRegressor(n_estimators=100),
                    'Gradient Boosting': GradientBoostingRegressor(),
                    'SVR': SVR(),
                    'KNN': KNeighborsRegressor(),
                }
            else:
                base_models = {
                    'Logistic Regression': LogisticRegression(max_iter=1000),
                    'Random Forest': RandomForestClassifier(n_estimators=100),
                    'Gradient Boosting': GradientBoostingClassifier(),
                    'SVC': SVC(probability=True),
                    'KNN': KNeighborsClassifier(),
                }
        else:
            if task_type == 'regression':
                base_models = {
                    'Deep Neural Net': MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=1000),
                }
            else:
                base_models = {
                    'Deep Neural Net': MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=1000),
                }

        # Train and Evaluate using Pipelines
        trained_pipelines = {}
        for name, model in base_models.items():
            try:
                m_start = time.time()
                
                # Create Full Pipeline
                clf = Pipeline(steps=[('preprocessor', preprocessor),
                                    ('model', model)])
                
                # Fit Pipeline
                clf.fit(X_train, y_train)
                trained_pipelines[name] = clf
                
                preds = clf.predict(X_test)
                
                if task_type == 'regression':
                    try:
                        score = r2_score(y_test, preds)
                    except:
                        score = 0.0
                    
                    # R2 can be negative if the model is very poor. Cap at 0 for UI clarity.
                    display_score = max(0.0, float(score)) if not (np.isnan(score) or np.isinf(score)) else 0.0
                    
                    results.append({
                        'name': name,
                        'score': display_score,
                        'metric': 'R2 Score',
                        'time': round(time.time() - m_start, 4)
                    })
                else:
                    score = accuracy_score(y_test, preds)
                    results.append({
                        'name': name,
                        'score': float(score),
                        'metric': 'Accuracy',
                        'time': round(time.time() - m_start, 4)
                    })
            except Exception as model_err:
                print(f"Model {name} failed: {model_err}")
                continue
        
        if not results:
            return jsonify({'error': 'All models failed.'}), 500
        
        results = sorted(results, key=lambda x: x['score'], reverse=True)
        best_model_name = results[0]['name']
        best_pipeline = trained_pipelines[best_model_name]
        
        # Store for real-time prediction
        data_store[f"{session_id}_pipeline"] = best_pipeline
        data_store[f"{session_id}_best_model"] = best_pipeline.named_steps['model']
        data_store[f"{session_id}_feature_cols"] = feature_cols
        data_store[f"{session_id}_numeric_features"] = numeric_features
        data_store[f"{session_id}_categorical_features"] = categorical_features
        data_store[f"{session_id}_task_type"] = task_type
        if task_type == 'classification':
            data_store[f"{session_id}_le"] = le
        
        # 3. Feature Importance Analysis
        feature_importance = []
        try:
            best_model = best_pipeline.named_steps['model']
            raw_importance = None
            if hasattr(best_model, 'feature_importances_'):
                raw_importance = best_model.feature_importances_
            elif hasattr(best_model, 'coef_'):
                raw_importance = np.abs(best_model.coef_)
                if len(raw_importance.shape) > 1: # Multiclass classification
                    raw_importance = np.mean(raw_importance, axis=0)
            
            if raw_importance is not None:
                # Get feature names from preprocessor
                try:
                    # For newer sklearn versions
                    ohe_cols = best_pipeline.named_steps['preprocessor'].named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(categorical_features).tolist()
                except:
                    ohe_cols = categorical_features # fallback
                
                all_feature_names = numeric_features + ohe_cols
                
                importance_list = [
                    {'feature': name, 'importance': float(val)}
                    for name, val in zip(all_feature_names, raw_importance)
                ]
                # Sort by importance descending and take top 15
                feature_importance = sorted(importance_list, key=lambda x: x['importance'], reverse=True)[:15]
        except Exception as e:
            print(f"Feature importance failed: {e}")
            
        # 4. Classification Metrics (Confusion Matrix & ROC)
        classification_metrics = None
        if task_type == 'classification':
            try:
                # Confusion Matrix
                y_pred = best_pipeline.predict(X_test)
                cm = confusion_matrix(y_test, y_pred)
                
                # ROC Curve (Simplifying to binary or primary class for multi-class)
                roc_data = None
                if hasattr(best_model, "predict_proba"):
                    probs = best_pipeline.predict_proba(X_test)
                    if probs.shape[1] == 2: # Binary
                        fpr, tpr, _ = roc_curve(y_test, probs[:, 1])
                        roc_auc = auc(fpr, tpr)
                        roc_data = {
                            'fpr': fpr.tolist(),
                            'tpr': tpr.tolist(),
                            'auc': float(roc_auc)
                        }
                
                classification_metrics = {
                    'confusion_matrix': cm.tolist(),
                    'labels': [str(l) for l in le.classes_],
                    'roc_curve': roc_data
                }
            except Exception as e:
                print(f"Classification metrics failed: {e}")

        total_time = round(time.time() - start_total, 4)
        return jsonify({
            'results': results,
            'train_size': len(X_train),
            'test_size': len(X_test),
            'best_model': best_model_name,
            'total_time': total_time,
            'feature_importance': feature_importance,
            'classification_metrics': classification_metrics
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Auto-train removed

@ds_bp.route('/viz-data', methods=['POST'])
def get_viz_data():
    data = request.json
    session_id = data.get('session_id', 'default')
    column = data.get('column')
    
    if session_id not in data_store:
        file_path = os.path.join(UPLOAD_FOLDER, f"data_{session_id}.csv")
        if os.path.exists(file_path):
            try:
                data_store[session_id] = pd.read_csv(file_path)
            except:
                return jsonify({'error': 'Failed to recover session.'}), 400
        else:
            return jsonify({'error': 'No data found.'}), 400
    
    df = data_store[session_id]
    
    if column not in df.columns:
        return jsonify({'error': f'Column {column} not found.'}), 400
    
    try:
        # Determine if numeric or categorical
        if pd.api.types.is_numeric_dtype(df[column]):
            # Numerical: Histogram data
            counts, bins = np.histogram(df[column].dropna(), bins=10)
            labels = [f"{round(bins[i], 2)}-{round(bins[i+1], 2)}" for i in range(len(bins)-1)]
            return jsonify({
                'type': 'bar',
                'labels': labels,
                'values': counts.tolist(),
                'title': f'Distribution of {column}'
            })
        else:
            # Categorical: Count plot data
            value_counts = df[column].value_counts().head(10) # Top 10 categories
            return jsonify({
                'type': 'pie',
                'labels': value_counts.index.tolist(),
                'values': value_counts.values.tolist(),
                'title': f'Category Counts for {column}'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ds_bp.route('/scatter', methods=['POST'])
def get_scatter_data():
    data = request.json
    session_id = data.get('session_id', 'default')
    col_x = data.get('col_x')
    col_y = data.get('col_y')
    
    if session_id not in data_store:
        file_path = os.path.join(UPLOAD_FOLDER, f"data_{session_id}.csv")
        if os.path.exists(file_path):
            try:
                data_store[session_id] = pd.read_csv(file_path)
            except:
                return jsonify({'error': 'Failed to recover session.'}), 400
        else:
            return jsonify({'error': 'No data found.'}), 400
    
    df = data_store[session_id]
    try:
        clean_df = df[[col_x, col_y]].dropna()
        return jsonify({
            'type': 'scatter',
            'x': clean_df[col_x].tolist(),
            'y': clean_df[col_y].tolist(),
            'title': f'{col_y} vs {col_x}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ds_bp.route('/clean', methods=['POST'])
def clean_data():
    data = request.json
    session_id = data.get('session_id', 'default')
    action = data.get('action') # 'drop_col', 'fill_na'
    column = data.get('column')
    
    if session_id not in data_store:
        file_path = os.path.join(UPLOAD_FOLDER, f"data_{session_id}.csv")
        if os.path.exists(file_path):
            try:
                data_store[session_id] = pd.read_csv(file_path)
            except:
                return jsonify({'error': 'Failed to recover session.'}), 400
        else:
            return jsonify({'error': 'No data found.'}), 400
    
    df = data_store[session_id]
    try:
        if action == 'drop_col':
            df = df.drop(columns=[column])
        elif action == 'fill_na':
            strategy = data.get('strategy', 'mean')
            if strategy == 'mean':
                df[column] = df[column].fillna(df[column].mean())
            elif strategy == 'median':
                df[column] = df[column].fillna(df[column].median())
            elif strategy == 'mode':
                df[column] = df[column].fillna(df[column].mode()[0])
        
        data_store[session_id] = df
        return jsonify({'success': True, 'columns': list(df.columns)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ds_bp.route('/export', methods=['GET'])
def export_model():
    session_id = request.args.get('session_id', 'default')
    model_key = f"{session_id}_best_model"
    
    if model_key not in data_store:
        return jsonify({'error': 'No trained model found to export.'}), 404
    
    try:
        model = data_store[model_key]
        
        # Save to a temporary file
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, f"nexus_model_{session_id}.pkl")
        joblib.dump(model, file_path)
        
        from flask import send_file
        return send_file(
            file_path,
            as_attachment=True,
            download_name="nexus_trained_model.pkl",
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
