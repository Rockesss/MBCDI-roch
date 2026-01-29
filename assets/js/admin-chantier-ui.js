/**
 * MBCDI Admin Chantier UI
 * Upload du logo affiché sur le front au-dessus de "Où allez-vous ?"
 * @version 5.5.0
 */
(function($) {
    'use strict';

    $(document).ready(function() {
        if (!$('#mbcdi_ui_logo_id').length) return;

        let mediaUploader = null;

        $('#mbcdi_upload_ui_logo').on('click', function(e) {
            e.preventDefault();

            if (typeof wp === 'undefined' || !wp.media) {
                alert('Media uploader non disponible. Rechargez la page.');
                return;
            }

            if (mediaUploader) {
                mediaUploader.open();
                return;
            }

            mediaUploader = wp.media({
                title: 'Choisir un logo (front)',
                button: { text: 'Utiliser cette image' },
                multiple: false,
                library: { type: 'image' }
            });

            mediaUploader.on('select', function() {
                const attachment = mediaUploader.state().get('selection').first().toJSON();
                $('#mbcdi_ui_logo_id').val(attachment.id);
                $('#mbcdi-ui-logo-preview').attr('src', attachment.url).show();
                $('#mbcdi_remove_ui_logo').show();
            });

            mediaUploader.open();
        });

        $('#mbcdi_remove_ui_logo').on('click', function(e) {
            e.preventDefault();
            $('#mbcdi_ui_logo_id').val('');
            $('#mbcdi-ui-logo-preview').attr('src', '').hide();
            $(this).hide();
        });
    });
})(jQuery);
