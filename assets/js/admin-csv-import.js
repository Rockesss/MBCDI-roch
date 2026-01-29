/**
 * MBCDI Admin - Import CSV JavaScript V4.9.0
 * Gestion de l'interface d'upload et de prévisualisation
 * @version 5.5.0
 */

(function($) {
    'use strict';

    var MBCDIImport = {
        currentStep: 1,
        csvData: null,
        fileData: null,

        init: function() {
            this.bindEvents();
            this.initDragDrop();
        },

        bindEvents: function() {
            // Navigation entre étapes
            $('.mbcdi-next-step').on('click', function() {
                var nextStep = $(this).data('next');
                MBCDIImport.goToStep(nextStep);
            });

            $('#mbcdi-back-to-upload').on('click', function() {
                MBCDIImport.goToStep(2);
            });

            // Upload de fichier
            $('#mbcdi-csv-file').on('change', function(e) {
                MBCDIImport.handleFileSelect(e.target.files[0]);
            });

            $('#mbcdi-remove-file').on('click', function() {
                MBCDIImport.removeFile();
            });

            // Bouton de prévisualisation
            $('#mbcdi-preview-btn').on('click', function() {
                MBCDIImport.previewCSV();
            });

            // Soumission du formulaire
            $('#mbcdi-csv-upload-form').on('submit', function(e) {
                e.preventDefault();
                MBCDIImport.startImport();
            });
        },

        initDragDrop: function() {
            var dropzone = $('#mbcdi-csv-dropzone');

            dropzone.on('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).addClass('mbcdi-dragover');
            });

            dropzone.on('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).removeClass('mbcdi-dragover');
            });

            dropzone.on('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).removeClass('mbcdi-dragover');

                var files = e.originalEvent.dataTransfer.files;
                if (files.length > 0) {
                    MBCDIImport.handleFileSelect(files[0]);
                }
            });
        },

        goToStep: function(stepNumber) {
            $('.mbcdi-import-step').removeClass('mbcdi-step-active');
            $('.mbcdi-import-step[data-step="' + stepNumber + '"]').addClass('mbcdi-step-active');
            this.currentStep = stepNumber;
        },

        handleFileSelect: function(file) {
            if (!file) return;

            // Vérifier le type
            if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
                alert('Veuillez sélectionner un fichier CSV');
                return;
            }

            // Vérifier la taille (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Le fichier est trop volumineux (max 10MB)');
                return;
            }

            this.fileData = file;

            // Afficher les infos du fichier
            $('#mbcdi-filename').text(file.name);
            $('#mbcdi-filesize').text(this.formatFileSize(file.size));
            $('#mbcdi-file-info').show();
            $('#mbcdi-preview-btn').prop('disabled', false);

            // Lire le fichier
            this.readCSVFile(file);
        },

        removeFile: function() {
            this.fileData = null;
            this.csvData = null;
            $('#mbcdi-csv-file').val('');
            $('#mbcdi-file-info').hide();
            $('#mbcdi-preview-btn').prop('disabled', true);
        },

        readCSVFile: function(file) {
            var reader = new FileReader();

            reader.onload = function(e) {
                var content = e.target.result;
                MBCDIImport.parseCSV(content);
            };

            reader.onerror = function() {
                alert('Erreur lors de la lecture du fichier');
            };

            reader.readAsText(file);
        },

        parseCSV: function(content) {
            var lines = content.split('\n');
            var data = [];

            if (lines.length < 2) {
                alert('Le fichier CSV est vide');
                return;
            }

            // Parser l'entête
            var headers = this.parseCSVLine(lines[0]);
            
            // Parser les lignes de données
            for (var i = 1; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;

                var values = this.parseCSVLine(line);
                if (values.length !== headers.length) continue;

                var row = {};
                for (var j = 0; j < headers.length; j++) {
                    row[headers[j].trim().toLowerCase()] = values[j].trim();
                }
                data.push(row);
            }

            this.csvData = {
                headers: headers,
                rows: data
            };

            console.log('CSV parsé:', this.csvData);
        },

        parseCSVLine: function(line) {
            var values = [];
            var current = '';
            var inQuotes = false;

            for (var i = 0; i < line.length; i++) {
                var char = line[i];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }

            values.push(current);
            return values;
        },

        previewCSV: function() {
            if (!this.csvData || !this.csvData.rows.length) {
                alert('Aucune donnée à prévisualiser');
                return;
            }

            this.goToStep(3);
            this.displayPreview();
        },

        displayPreview: function() {
            var data = this.csvData.rows;
            var validCount = 0;
            var errorCount = 0;
            var warningCount = 0;

            // Validation et comptage
            var validatedData = data.map(function(row, index) {
                var validation = MBCDIImport.validateRow(row, index + 2);
                
                if (validation.status === 'ok') validCount++;
                else if (validation.status === 'error') errorCount++;
                else warningCount++;

                return {
                    row: row,
                    validation: validation
                };
            });

            // Afficher les stats
            var statsHTML = `
                <div class="mbcdi-stat-card mbcdi-success">
                    <div class="mbcdi-stat-number">${validCount}</div>
                    <div class="mbcdi-stat-label">Valides</div>
                </div>
                <div class="mbcdi-stat-card mbcdi-error">
                    <div class="mbcdi-stat-number">${errorCount}</div>
                    <div class="mbcdi-stat-label">Erreurs</div>
                </div>
                <div class="mbcdi-stat-card">
                    <div class="mbcdi-stat-number">${warningCount}</div>
                    <div class="mbcdi-stat-label">Avertissements</div>
                </div>
                <div class="mbcdi-stat-card">
                    <div class="mbcdi-stat-number">${data.length}</div>
                    <div class="mbcdi-stat-label">Total</div>
                </div>
            `;
            $('#mbcdi-preview-stats').html(statsHTML);

            // Afficher les erreurs si présentes
            if (errorCount > 0) {
                var errorsList = validatedData
                    .filter(function(item) { return item.validation.status === 'error'; })
                    .map(function(item) {
                        return '<li>' + item.validation.message + '</li>';
                    })
                    .join('');

                $('#mbcdi-preview-errors').html(`
                    <h4>⚠️ Erreurs détectées</h4>
                    <ul>${errorsList}</ul>
                    <p><strong>Note:</strong> Les lignes avec erreurs seront ignorées lors de l'import.</p>
                `).show();
            }

            // Afficher le tableau (max 20 premières lignes)
            var tableBody = validatedData.slice(0, 20).map(function(item) {
                var statusClass = 'mbcdi-status-' + item.validation.status;
                var statusIcon = item.validation.status === 'ok' ? '✓' : 
                                item.validation.status === 'error' ? '✗' : '⚠';

                var gps = item.row.latitude && item.row.longitude ? 
                    `${parseFloat(item.row.latitude).toFixed(4)}, ${parseFloat(item.row.longitude).toFixed(4)}` : 
                    '-';

                return `
                    <tr>
                        <td class="${statusClass}">${statusIcon}</td>
                        <td><strong>${MBCDIImport.escapeHtml(item.row.nom || '-')}</strong></td>
                        <td>${MBCDIImport.escapeHtml(item.row.adresse || '-')}</td>
                        <td>${gps}</td>
                        <td>${MBCDIImport.escapeHtml(item.row.telephone || '-')}</td>
                        <td>${MBCDIImport.escapeHtml(item.row.type || '-')}</td>
                        <td>${item.row.zone_livraison_id || '-'}</td>
                    </tr>
                `;
            }).join('');

            $('#mbcdi-preview-table tbody').html(tableBody);

            if (data.length > 20) {
                $('#mbcdi-preview-table tbody').append(`
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                            ... et ${data.length - 20} autres commerces
                        </td>
                    </tr>
                `);
            }
        },

        validateRow: function(row, lineNumber) {
            var errors = [];

            // Nom obligatoire
            if (!row.nom || row.nom.trim() === '') {
                errors.push('nom manquant');
            }

            // Latitude obligatoire et valide
            if (!row.latitude || row.latitude.trim() === '') {
                errors.push('latitude manquante');
            } else {
                var lat = parseFloat(row.latitude);
                if (isNaN(lat) || lat < -90 || lat > 90) {
                    errors.push('latitude invalide (' + row.latitude + ')');
                }
            }

            // Longitude obligatoire et valide
            if (!row.longitude || row.longitude.trim() === '') {
                errors.push('longitude manquante');
            } else {
                var lng = parseFloat(row.longitude);
                if (isNaN(lng) || lng < -180 || lng > 180) {
                    errors.push('longitude invalide (' + row.longitude + ')');
                }
            }

            // URL logo si présente
            if (row.logo_url && row.logo_url.trim() !== '') {
                if (!this.isValidURL(row.logo_url)) {
                    errors.push('URL logo invalide');
                }
            }

            if (errors.length > 0) {
                return {
                    status: 'error',
                    message: 'Ligne ' + lineNumber + ': ' + errors.join(', ')
                };
            }

            // Avertissements (non bloquants)
            var warnings = [];
            if (!row.adresse) warnings.push('adresse manquante');
            if (!row.telephone) warnings.push('téléphone manquant');

            if (warnings.length > 0) {
                return {
                    status: 'warning',
                    message: 'Ligne ' + lineNumber + ': ' + warnings.join(', ')
                };
            }

            return {
                status: 'ok',
                message: 'Ligne ' + lineNumber + ' : OK'
            };
        },

        isValidURL: function(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        },

        startImport: function() {
            this.goToStep(4);

            var formData = new FormData($('#mbcdi-csv-upload-form')[0]);
            
            // Simuler la progression (en production, utiliser AJAX)
            var total = this.csvData.rows.length;
            var current = 0;

            $('#mbcdi-progress-total').text(total);

            var interval = setInterval(function() {
                current++;
                var percent = Math.round((current / total) * 100);

                $('#mbcdi-import-progress').css('width', percent + '%').text(percent + '%');
                $('#mbcdi-progress-current').text(current);

                if (current >= total) {
                    clearInterval(interval);
                    
                    // Soumettre le formulaire
                    setTimeout(function() {
                        $('#mbcdi-csv-upload-form')[0].submit();
                    }, 500);
                }
            }, 50);
        },

        formatFileSize: function(bytes) {
            if (bytes === 0) return '0 Bytes';
            var k = 1024;
            var sizes = ['Bytes', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

        escapeHtml: function(text) {
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text ? text.replace(/[&<>"']/g, function(m) { return map[m]; }) : '';
        }
    };

    // Initialiser au chargement
    $(document).ready(function() {
        if ($('.mbcdi-csv-import-page').length) {
            MBCDIImport.init();
        }
    });

})(jQuery);
